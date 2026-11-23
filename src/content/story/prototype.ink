// CyberWR: prototype story (placeholder copy; final script to be written with the team).
// Conventions: "Speaker: line" sets the speaker; "PLAYER:" uses the player's name.
// Tags (# key: value) are forwarded to the scene, e.g. # anim: surprise

EXTERNAL getFlag(name)
EXTERNAL setFlag(name, value)
VAR player_name = "Alex"

=== bedroom_intro ===
11:47 PM. The mandatory security training is due at nine.
PLAYER: One more coffee and I'll start it. Probably.
The work laptop on the desk gives a soft, impatient chime.
-> END

=== bedroom_window ===
The city hums below. Somewhere out there, a thousand inboxes are filling up with things nobody should click.
-> END

=== bedroom_poster ===
A faded poster: "THINK BEFORE YOU CLICK." Someone has drawn a tiny moustache on the cursor.
-> END

=== bedroom_laptop ===
{ getFlag("laptop_seen"):
    The laptop chimes again. Insistent.
- else:
    PLAYER: That's not a notification sound I've ever heard.
    ~ setFlag("laptop_seen", true)
}
* [Open the laptop]
    ~ setFlag("laptop_open", true)
    -> END
* [Leave it for now]
    PLAYER: Whatever it is, it can wait until morning.
    -> END

=== laptop_message ===
A message window opens by itself. No sender. No subject line.
"Hello, {player_name}. You don't know me yet, but CyberTown needs someone who reads the fine print."
"Five districts have gone dark. We have one portal left, and it's pointed at you."
- (choice)
* [ACCEPT]
    -> accepted
* [Report as phishing]
    "Good instinct. Genuinely. But this one's real. Please."
    -> choice
* [Close the window]
    The window does not close. The cursor politely moves itself back to ACCEPT.
    -> choice
= accepted
~ setFlag("portal_accepted", true)
The screen begins to hum.
-> END

=== cybertown_arrival ===
PLAYER: ...That was not in the onboarding. # anim: surprise
Gus: Easy, easy, you made it! Welcome to CyberTown.
Gus: Sorry about the landing. The portal has been a bit glitchy since... well, since everything.
PLAYER: Who are you? Where is this?
Gus: Gus. Local guide, part-time worrier. This is where every password, every message and every click you've ever made ends up living.
Gus: Lately someone's been picking our locks. Five districts have gone dark.
Gus: Have a look around. When you're ready, talk to me and we'll get started.
~ setFlag("arrived", true)
-> END

=== gus_talk ===
Gus: Ready when you are.
- (menu)
* [What is this place?]
    Gus: The town behind the screen. Your habits built most of it, so be nice to it.
    -> menu
* [What happened to the districts?]
    Gus: Small mistakes, one after another. A reused password here, a rushed click there. It adds up.
    -> menu
+ [Let's go]
    Gus: That's the spirit. The districts open in the next update. Literally.
    -> END

=== building_locked(name) ===
{name}. The door is sealed with a flickering lock.
Gus: That district opens later. We'll get there.
-> END

=== noticeboard ===
TOWN NOTICE: "Lost: one password. Answers to 'Password123'. If found, please do not return it."
-> END
