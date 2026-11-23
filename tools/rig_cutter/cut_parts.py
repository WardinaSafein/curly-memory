#!/usr/bin/env python3
"""
CyberWR rig cutter: turns the approved design + ChatGPT full-image edits into the
28 rig part PNGs (see docs/edit-kit/ and docs/PROMPT_PACK.md).

    python3 tools/rig_cutter/cut_parts.py --edits <folder with edit_*.png> --out <folder>

Requires numpy and Pillow. Writes <out>/characters/player/*.png (ready for
assets-src/) plus <out>/report/ (ownership map, composite, notes).

How it works
  1. Every edit is aligned to the design and its black background turned into alpha.
  2. Each visible pixel of the target character (design, with the redrawn front boot)
     is assigned to exactly one part: arms from the "no arms" edit difference,
     head/hair/neck by colour and the rig's guide shapes, the rest by guide shapes and
     the nearest bone segment.
  3. Each part gets ~30 px of overlap past its joints:
       - under parts drawn above it (hidden at rest): the art revealed by an edit
         (jacket behind the arms, skin behind the features, belt behind the hem), or
         an extrusion of the part's own edge colours;
       - over parts drawn below it: a copy of the real art, so the rest pose is unchanged.
  4. Face feature states are extracted as differences from the blank-face edit.
  5. Light edge fringe on the outer silhouette is removed.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, H = 1024, 1536

EDITS = {
    'boot': 'edit_01_boot.png', 'blank': 'edit_02_blankface.png',
    'eyes_half': 'edit_03_eyes_half.png', 'eyes_closed': 'edit_04_eyes_closed.png', 'eyes_wide': 'edit_05_eyes_wide.png',
    'brows_raised': 'edit_06_brows_raised.png', 'mouth_neutral': 'edit_07_mouth_neutral.png',
    'mouth_surprised': 'edit_08_mouth_surprised.png', 'no_arms': 'edit_09_no_arms.png', 'belt': 'edit_10_belt.png',
}
ARM_SLOTS = ['upperarm_front', 'forearm_front', 'hand_front', 'upperarm_back', 'forearm_back', 'hand_back']
LEG_SLOTS = ['thigh_front', 'shin_front', 'foot_front', 'thigh_back', 'shin_back', 'foot_back']
FACE_STATES = {
    'eyes': {'open': 'ref', 'half': 'eyes_half', 'closed': 'eyes_closed', 'wide': 'eyes_wide'},
    'brows': {'neutral': 'ref', 'raised': 'brows_raised'},
    'mouth': {'smile': 'ref', 'neutral': 'mouth_neutral', 'surprised': 'mouth_surprised'},
}


# ---------------------------------------------------------------- image helpers

def load_rgba(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255.0


def edit_to_rgba(path):
    """Edit on a black background -> straight-alpha RGBA on the 1024x1536 canvas."""
    rgb = np.zeros((H, W, 3), np.float32)
    e = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255.0
    rgb[: min(H, e.shape[0]), : min(W, e.shape[1])] = e[:H, :W]
    m = rgb.max(axis=2)
    a = np.clip((m - 0.07) / 0.10, 0, 1)            # black (with noise up to ~0.15) -> transparent, outlines (~0.2) -> opaque
    col = np.where(a[..., None] > 0, rgb / np.maximum(a[..., None], 1e-3), 0)  # un-premultiply from black
    return np.dstack([np.clip(col, 0, 1), a])


def lum(img):
    return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114


def best_shift(ref, img, mask, rng=6):
    rl, il = lum(ref), lum(img)
    best = (1e9, 0, 0)
    ys, xs = np.nonzero(mask)
    ys, xs = ys[::11], xs[::11]
    for dy in range(-rng, rng + 1):
        for dx in range(-rng, rng + 1):
            yy, xx = np.clip(ys - dy, 0, H - 1), np.clip(xs - dx, 0, W - 1)
            d = np.abs(il[yy, xx] - rl[ys, xs]).mean()
            if d < best[0]:
                best = (d, dx, dy)
    return best[1], best[2]


def shift(img, dx, dy):
    return np.roll(np.roll(img, dy, axis=0), dx, axis=1)


def dilate(mask, r):
    m = mask.copy()
    for _ in range(r):
        n = m.copy()
        n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
        m = n
    return m


def erode(mask, r):
    return ~dilate(~mask, r)


def open_mask(mask, r):
    return dilate(erode(mask, r), r)


def box_count(mask, k):
    """Number of set pixels in the k x k window around each pixel."""
    c = np.pad(mask.astype(np.int32), k // 2 + 1).cumsum(0).cumsum(1)
    h, w = mask.shape
    a = c[k:k + h, k:k + w] - c[0:h, k:k + w] - c[k:k + h, 0:w] + c[0:h, 0:w]
    return a


def despeck(mask, k=7, min_count=6):
    """Drop isolated specks but keep thin lines (a line still has neighbours along its length)."""
    return mask & (box_count(mask, k) >= min_count)


# ---------------------------------------------------------------- rig geometry

def shape_mask(shape, grow=0):
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    t = shape['type']
    if t == 'capsule':
        (ax, ay), (bx, by) = shape['a'], shape['b']
        r1, r2 = shape['r1'] + grow, shape['r2'] + grow
        d.ellipse([ax - r1, ay - r1, ax + r1, ay + r1], fill=255)
        d.ellipse([bx - r2, by - r2, bx + r2, by + r2], fill=255)
        L = max(1e-6, np.hypot(bx - ax, by - ay))
        nx, ny = -(by - ay) / L, (bx - ax) / L
        d.polygon([(ax + nx * r1, ay + ny * r1), (bx + nx * r2, by + ny * r2), (bx - nx * r2, by - ny * r2), (ax - nx * r1, ay - ny * r1)], fill=255)
        return np.asarray(im) > 0
    if t == 'ellipse':
        (cx, cy), rx, ry = shape['c'], shape['rx'] + grow, shape['ry'] + grow
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
        return np.asarray(im) > 0
    if t == 'rect':
        d.rectangle([shape['x'] - grow, shape['y'] - grow, shape['x'] + shape['w'] + grow, shape['y'] + shape['h'] + grow], fill=255)
        return np.asarray(im) > 0
    d.polygon([tuple(p) for p in shape['points']], fill=255)
    m = np.asarray(im) > 0
    return dilate(m, grow) if grow else m


def seg_dist(px, py, a, b):
    ax, ay = a; bx, by = b
    vx, vy = bx - ax, by - ay
    L2 = max(vx * vx + vy * vy, 1e-6)
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1)
    return np.hypot(px - (ax + t * vx), py - (ay + t * vy))


def probes(rig, slot):
    out = [tuple(p) for p in slot.get('mustCover', [])]
    d = rig.get('overlapProbe', 0)
    s = slot['shape']
    if d and s['type'] == 'capsule':
        (ax, ay), (bx, by) = s['a'], s['b']
        L = max(1e-6, np.hypot(bx - ax, by - ay)); ux, uy = (bx - ax) / L, (by - ay) / L
        out += [(round(ax - ux * d), round(ay - uy * d)), (round(bx + ux * d), round(by + uy * d))]
    return out


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--edits', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--ref', default=os.path.join(ROOT, 'docs', 'rig-template', 'design_reference.png'))
    ap.add_argument('--rig', default=os.path.join(ROOT, 'src', 'content', 'characters', 'player.rig.json'))
    args = ap.parse_args()

    rig = json.load(open(args.rig))
    slots = {s['id']: s for s in rig['slots']}
    order = {s['id']: i for i, s in enumerate(rig['slots'])}
    bones = {b['id']: b for b in rig['bones']}
    notes = []

    ref = load_rgba(args.ref)
    S_ref = ref[..., 3] > 0.03
    ed = {}
    for k, f in EDITS.items():
        p = os.path.join(args.edits, f)
        if k == 'no_arms' and os.path.exists(os.path.join(args.edits, 'edit_09b_shoulders.png')):
            p = os.path.join(args.edits, 'edit_09b_shoulders.png')   # corrected shoulders, when delivered
            notes.append('using edit_09b_shoulders.png for the jacket behind the arms')
        if not os.path.exists(p):
            sys.exit(f'missing {p}')
        img = edit_to_rgba(p)
        dx, dy = best_shift(ref, img, S_ref)
        if dx or dy:
            notes.append(f'{f}: aligned by ({dx}, {dy}) px')
        ed[k] = shift(img, dx, dy)

    def diff(a, b):
        return np.abs(a[..., :3] * a[..., 3:] - b[..., :3] * b[..., 3:]).max(axis=2)

    # ---- target composite: design with the redrawn front boot
    foot_zone = dilate(shape_mask(slots['foot_front']['shape'], 30) | shape_mask(slots['shin_front']['shape'], 0) & (np.arange(H)[:, None] > 1290), 4)
    boot_changed = foot_zone & (diff(ref, ed['boot']) > 0.12)
    boot_region = dilate(open_mask(boot_changed, 2), 6) & foot_zone
    T = ref.copy()
    T[boot_region] = ed['boot'][boot_region]
    S = T[..., 3] > 0.03

    # ---- edge fringe removal on the outer silhouette
    ring = S & ~erode(S, 3)
    sat = T[..., :3].max(2) - T[..., :3].min(2)
    fringe = ring & (lum(T) > 0.55) & (sat < 0.25)
    # Recolour fringe pixels to the nearby outline colour instead of deleting them: deleting
    # leaves a dotted, ragged outline; recolouring keeps the soft anti-aliased edge.
    dark = (lum(T) < 0.32) & (T[..., 3] > 0.5) & ~fringe
    k = 9
    cnt = box_count(dark, k).astype(np.float32)
    outline = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        cs = np.pad(T[..., c] * dark, k // 2 + 1).cumsum(0).cumsum(1)
        outline[..., c] = cs[k:k + H, k:k + W] - cs[0:H, k:k + W] - cs[k:k + H, 0:W] + cs[0:H, 0:W]
    fallback = np.array([0.22, 0.18, 0.17], np.float32)
    col = np.where(cnt[..., None] > 0, outline / np.maximum(cnt[..., None], 1), fallback)
    T[fringe, :3] = col[fringe]
    S = T[..., 3] > 0.03
    notes.append(f'recoloured {int(fringe.sum())} light fringe pixels on the outline')

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    owner = np.full((H, W), '', dtype=object)

    # ---- arms: what the "no arms" edit removed, plus the shoulder caps
    arm_zone = np.zeros((H, W), bool)
    for s in ARM_SLOTS:
        arm_zone |= shape_mask(slots[s]['shape'], 40)
    # arm pixels = design pixels the "no arms" edit doesn't have (sleeves/hands sticking out of the body)
    # plus strong changes close to the arm shapes (arms in front of the jacket and trousers);
    # the edit also redraws the jacket a little, so changes far from the arms are ignored
    arm_near = np.zeros((H, W), bool)
    for s_ in ARM_SLOTS:
        arm_near |= shape_mask(slots[s_]['shape'], 12)
    body_no_arms = erode(ed['no_arms'][..., 3] > 0.5, 2)
    outside_body = S & ~body_no_arms & arm_zone
    changed = arm_near & (diff(ref, ed['no_arms']) > 0.27) & S
    arm_mask = dilate(open_mask(outside_body | changed, 3), 2) & S & arm_zone
    # the front shoulder cap sits on top of the jacket, so it belongs to the arm;
    # the back arm is drawn behind the jacket, so its shoulder area stays with the torso
    arm_mask |= shape_mask(slots['upperarm_front']['shape'], 0) & S & (yy < 620)
    segs = {}
    for s in ARM_SLOTS:
        sh = slots[s]['shape']
        if sh['type'] == 'capsule':
            segs[s] = (sh['a'], sh['b'])
        else:
            pv = bones[slots[s]['bone']]['pivot']
            c = sh['c'] if sh['type'] == 'ellipse' else np.mean(sh['points'], axis=0).tolist()
            segs[s] = (pv, c)
    ys, xs = np.nonzero(arm_mask)
    dists = np.stack([seg_dist(xs, ys, *segs[s]) for s in ARM_SLOTS])
    pick = np.array(ARM_SLOTS, dtype=object)[dists.argmin(axis=0)]
    owner[ys, xs] = pick

    # ---- head group: head (skin), neck, hair
    torso_poly = shape_mask(slots['torso']['shape'])
    head_poly = shape_mask(slots['head']['shape'], 8)
    neck_caps = shape_mask(slots['neck']['shape'], 6)
    hair_front = shape_mask(slots['hair_front']['shape'], 6)
    hair_zone = shape_mask(slots['hair_back']['shape'], 26) | hair_front | head_poly
    def skin_of(img):
        r, g, b = img[..., 0], img[..., 1], img[..., 2]
        # warm, light-to-mid skin incl. shaded ear; excludes brown hair (dark) and ochre jacket (low blue)
        return (r > 0.58) & (r >= g) & (g >= b) & (b > 0.26) & (r - b > 0.12) & (img[..., 3] > 0.5)
    skin = skin_of(T)
    free = S & (owner == '')
    head_group = free & hair_zone & ~torso_poly & (yy < 470)
    face_zone = np.zeros((H, W), bool)
    for f in ['eyes', 'brows', 'mouth']:
        face_zone |= shape_mask(slots[f]['shape'], 4)
    dark = lum(T) < 0.25
    owner[head_group & skin & neck_caps & ~shape_mask(slots['head']['shape'], 0) & (yy > 395)] = 'neck'
    is_head = head_group & (owner == '') & head_poly & (skin | face_zone | (dark & dilate(skin, 3) & ~hair_front))
    owner[is_head] = 'head'
    # Hair strands inside the face-feature zones belong above the features (hair_front),
    # taken from the blank-face edit so no eye from the design is baked into them.
    blank_skin_near = dilate(skin_of(ed['blank']), 2)
    strands = (owner == 'head') & face_zone & ~blank_skin_near & (ed['blank'][..., 3] > 0.5)
    owner[strands] = 'hair_front'
    from_blank = strands
    rest = head_group & (owner == '')
    owner[rest & hair_front] = 'hair_front'
    owner[rest & ~hair_front] = 'hair_back'
    owner[free & (owner == '') & neck_caps & (yy < 480) & skin] = 'neck'

    # ---- torso, pelvis, legs
    pelvis_poly = shape_mask(slots['pelvis']['shape'])
    free = S & (owner == '')
    owner[free & torso_poly & (yy < 748)] = 'torso'
    free = S & (owner == '')
    owner[free & pelvis_poly] = 'pelvis'
    free = S & (owner == '')
    owner[free & (yy < 700)] = 'torso'                   # jacket parts outside the guide polygon
    free = S & (owner == '')
    legs = {}
    for s in LEG_SLOTS:
        sh = slots[s]['shape']
        if sh['type'] == 'capsule':
            legs[s] = (sh['a'], sh['b'])
        else:
            pv = bones[slots[s]['bone']]['pivot']
            legs[s] = (pv, np.mean(sh['points'], axis=0).tolist())
    ys, xs = np.nonzero(free)
    d = np.stack([seg_dist(xs, ys, *legs[s]) for s in LEG_SLOTS])
    # feet own everything below their ankle line
    pick = np.array(LEG_SLOTS, dtype=object)[d.argmin(axis=0)]
    for foot, ank in [('foot_front', bones['foot_front']['pivot']), ('foot_back', bones['foot_back']['pivot'])]:
        side = 'front' if foot.endswith('front') else 'back'
        below = (ys > ank[1] - 12) & np.isin(pick, [f'shin_{side}', foot])
        pick[below] = foot
    owner[ys, xs] = pick
    for th in ['thigh_front', 'thigh_back']:
        leg = shape_mask(slots[th]['shape'], 10)
        crotch = (owner == th) & ~leg & (yy < 980)
        owner[crotch] = 'pelvis'

    # ---- clean-up: arm residue and specks
    no_arm_sil = dilate(ed['no_arms'][..., 3] > 0.5, 1)
    for sid in ['torso', 'pelvis', 'thigh_front', 'thigh_back']:
        stray = (owner == sid) & ~no_arm_sil & arm_zone
        if stray.any():
            ys, xs = np.nonzero(stray)
            d = np.stack([seg_dist(xs, ys, *segs[a]) for a in ARM_SLOTS])
            owner[ys, xs] = np.array(ARM_SLOTS, dtype=object)[d.argmin(axis=0)]
    for sid in slots:
        m = owner == sid
        keep = despeck(m, 9, 10)
        owner[m & ~keep] = ''
    S = S & (owner != '')

    # ---- hidden-area sources per part (what is behind the parts drawn above it)
    # (source image, owners it reveals: the parts it shows the area behind; None = anywhere)
    arm_owned = np.isin(owner, ARM_SLOTS)
    hidden_src = {s: [] for s in slots}
    for s in ['torso', 'thigh_front', 'thigh_back', 'pelvis']:
        hidden_src[s].append((ed['no_arms'], arm_owned))
    hidden_src['pelvis'].insert(0, (ed['belt'], owner == 'torso'))
    hidden_src['head'].append((ed['blank'], None))

    parts = {}
    prob_fail = {}
    S_union = S | (ed['no_arms'][..., 3] > 0.5)
    for sid, slot in slots.items():
        if slot.get('states'):
            continue
        own = owner == sid
        out = np.zeros((H, W, 4), np.float32)
        base = ed['blank'] if sid == 'head' else T
        out[own] = base[own]
        if sid == 'hair_front':
            out[own & from_blank] = ed['blank'][own & from_blank]
        if sid == 'head':
            out[own, 3] = np.maximum(out[own, 3], T[own, 3])
        zone = shape_mask(slot['shape'], rig['jointOverlap'] + 6) & dilate(own, 90) & S_union & ~own
        if sid.startswith('hair'):
            zone &= np.zeros_like(zone)
        if sid == 'head':
            # head and hair share the head bone, so they never separate: no overlap into hair
            zone &= ~np.isin(owner, ['hair_back', 'hair_front'])
        above = np.zeros((H, W), bool)
        below = np.zeros((H, W), bool)
        for other, o in order.items():
            if other == sid or slots[other].get('states'):
                continue
            m = owner == other
            (above if o > order[sid] else below)[...] |= m
        # over lower parts: copy the real art (rest pose unchanged)
        # only a narrow band past the joint, so moving the lower part never reveals a stale copy
        vis = zone & below & dilate(own, rig.get('overlapProbe', 20) + 16)
        out[vis] = T[vis]
        # under higher parts: revealed art from an edit, else extrusion
        hid = zone & above
        filled = np.zeros((H, W), bool)
        for src, where in hidden_src[sid]:
            if where is arm_owned:
                # behind the arms the "no arms" edit is the truth: jacket where it has jacket,
                # empty where the sleeve stood out from the body
                take = hid & ~filled & arm_owned
                inside_guide = shape_mask(slot['shape'], 0)
                empty = take & (src[..., 3] <= 0.5)
                # empty in the edit but inside the part's own outline (e.g. at a shoulder joint): fill later
                take &= ~(empty & inside_guide)
                out[take] = src[take]
                out[take & (src[..., 3] <= 0.5), 3] = 0
            else:
                take = hid & ~filled & (src[..., 3] > 0.5) & (where if where is not None else True)
                out[take] = src[take]
            filled |= take
        todo = hid & ~filled
        known = (out[..., 3] > 0.95)
        for _ in range(100):
            if not todo.any():
                break
            acc = np.zeros((H, W, 4), np.float32); cnt = np.zeros((H, W), np.float32)
            for sy, sx in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                k = shift(known, sx, sy); v = shift(out, sx, sy)
                acc += v * k[..., None]; cnt += k
            grow = todo & (cnt > 0)
            out[grow] = acc[grow] / cnt[grow][:, None]
            out[grow, 3] = 1.0
            known |= grow; todo &= ~grow
        if sid in ('thigh_front', 'thigh_back'):
            out[~shape_mask(slot['shape'], 14), 3] = 0
        # round off hidden fills: thin slivers and spikes (which show when a joint opens) are removed
        solid_all = out[..., 3] > 0.05
        filled_extra = solid_all & ~own
        rounded = open_mask(solid_all, 4) | own
        out[filled_extra & ~rounded, 3] = 0
        # 2 px bleed along every internal join: neighbouring parts overlap slightly so the soft
        # edges of two parts never let the background show through as a hairline seam
        solid0 = out[..., 3] > 0.05
        bleed = dilate(solid0, 2) & S & ~solid0
        bsrc = base
        if sid == 'head':
            bleed &= ~face_zone          # the head stays skin-only in the feature zones
        if sid == 'hair_front':
            bsrc = ed['blank']           # hair overlaps the face with blank skin, never the design's eyes
        out[bleed] = bsrc[bleed]
        out[bleed, 3] = np.maximum(bsrc[bleed, 3], T[bleed, 3])
        # drop detached fragments: keep what is connected to the part's guide region
        solid = out[..., 3] > 0.05
        seed = solid & shape_mask(slot['shape'], 0)
        if seed.any() and not sid.startswith('hair'):
            for _ in range(400):
                grown = dilate(seed, 3) & solid
                if (grown == seed).all():
                    break
                seed = grown
            out[solid & ~seed, 3] = 0
        # recolour light specks on this part's own edge (re-render halos from the edits)
        solid = out[..., 3] > 0.5
        ring_p = solid & ~erode(solid, 2)
        sat_p = out[..., :3].max(2) - out[..., :3].min(2)
        specks = ring_p & (lum(out) > 0.6) & (sat_p < 0.22)
        if specks.any():
            dk = solid & (lum(out) < 0.32)
            kk = 9
            cnt_p = box_count(dk, kk).astype(np.float32)
            col_p = np.zeros((H, W, 3), np.float32)
            for c in range(3):
                cs = np.pad(out[..., c] * dk, kk // 2 + 1).cumsum(0).cumsum(1)
                col_p[..., c] = cs[kk:kk + H, kk:kk + W] - cs[0:H, kk:kk + W] - cs[kk:kk + H, 0:W] + cs[0:H, 0:W]
            col_p = np.where(cnt_p[..., None] > 0, col_p / np.maximum(cnt_p[..., None], 1), np.array([0.22, 0.18, 0.17], np.float32))
            out[specks, :3] = col_p[specks]
        missing = [p for p in probes(rig, slot) if out[p[1], p[0], 3] <= 0.5]
        if missing:
            prob_fail[sid] = missing
        parts[sid] = out

    # ---- face features: difference from the blank face
    blank = ed['blank']
    blank_skin = dilate(skin_of(blank), 1)
    srcs = {'ref': T, **ed}
    brow_rect, eye_rect = slots['brows']['shape'], slots['eyes']['shape']
    split_y = (brow_rect['y'] + brow_rect['h'] + eye_rect['y']) / 2   # brows above, eyes below
    for feat, states in FACE_STATES.items():
        zone = shape_mask(slots[feat]['shape'], 6)
        if feat == 'brows':
            zone &= yy < split_y
        if feat == 'eyes':
            zone &= yy >= split_y
        for st, key in states.items():
            src = srcs[key]
            # a feature = something drawn where the blank face has plain skin, clearly darker/lighter
            # than that skin (lines, irises, eye whites) or reddish (mouth interior)
            dl = np.abs(lum(src) - lum(blank))
            red = (src[..., 0] - src[..., 2] > 0.25) & (lum(src) < 0.55)
            m = zone & blank_skin & (diff(src, blank) > 0.14) & (src[..., 3] > 0.5) & ((dl > 0.09) | red)
            m = dilate(despeck(m, 5, 4), 1) & zone & blank_skin
            alpha = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
            out = np.zeros((H, W, 4), np.float32)
            out[..., :3] = src[..., :3]
            out[..., 3] = alpha * src[..., 3]
            parts[f'{feat}:{st}'] = out

    # ---- write
    pdir = os.path.join(args.out, 'characters', 'player')
    rdir = os.path.join(args.out, 'report')
    os.makedirs(pdir, exist_ok=True); os.makedirs(rdir, exist_ok=True)
    app = {'skin': 's01', 'hair': 'h01', 'outfit': 'o01', 'eyes': 'e01', 'brows': 'b01', 'mouth': 'm01'}

    def fname(slot, state=None):
        f = slot['file']
        for k, v in app.items():
            f = f.replace('{' + k + '}', v)
        return f.replace('{state}', state or '')

    def save(arr, path):
        a = (np.clip(arr, 0, 1) * 255).round().astype(np.uint8)
        a[a[..., 3] < 24, 3] = 0                        # near-invisible noise (from the edits' "black")
        a[a[..., 3] == 0, :3] = 0
        Image.fromarray(a, 'RGBA').save(path, optimize=True)

    for sid, slot in slots.items():
        if slot.get('states'):
            for st in slot['states']:
                save(parts[f'{sid}:{st}'], os.path.join(pdir, fname(slot, st)))
        else:
            save(parts[sid], os.path.join(pdir, fname(slot)))
    save(T, os.path.join(pdir, 'player_ref_o01.png'))

    # report: ownership map + rest composite
    rng = np.random.default_rng(7)
    colours = {s: rng.integers(60, 255, 3) for s in slots}
    om = np.zeros((H, W, 3), np.uint8)
    for s in slots:
        om[owner == s] = colours[s]
    Image.fromarray(om).save(os.path.join(rdir, 'ownership.png'))
    comp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for sid, slot in slots.items():
        key = f"{sid}:{slot['default']}" if slot.get('states') else sid
        a = (np.clip(parts[key], 0, 1) * 255).astype(np.uint8)
        comp.alpha_composite(Image.fromarray(a, 'RGBA'))
    comp.save(os.path.join(rdir, 'composite.png'))
    json.dump({'notes': notes, 'probe_failures': prob_fail}, open(os.path.join(rdir, 'cut_report.json'), 'w'), indent=1)
    print('\n'.join(notes))
    print('probe failures:', prob_fail or 'none')


if __name__ == '__main__':
    main()
