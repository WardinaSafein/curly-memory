import type { MissionDef } from '../../systems/defense/DefenseModel';

/**
 * Chapter 1, "The Missing Messages": defend the Post Office road from the Mail Thief.
 * Draft content (to be reviewed for accuracy and tone). Clues avoid unreliable tells such as
 * spelling mistakes; they focus on sender, real link destination, attachments, unusual
 * requests, reply-to tricks and pressure.
 */
export const ch1Phishing: MissionDef = {
  id: 'ch1_phishing',
  title: 'The Missing Messages',
  villain: 'The Mail Thief',
  health: 5,
  trust: 5,
  waves: [
    {
      id: 'w1',
      intro: 'Messages are heading for the Post Office. Click one to inspect it, then let it in, block it, or report it.',
      messages: ['m1', 'm2', 'm3', 'm4'],
      spacing: 7,
    },
    {
      id: 'w2',
      intro: 'Nice work. New habit unlocked: the MFA Gate. If a stolen password slips through once, it holds the door.',
      messages: ['m5', 'm6', 'm7', 'm8'],
      spacing: 6,
      unlock: 'mfa',
    },
    {
      id: 'w3',
      intro: 'The Mail Thief is getting clever. Disguises will look more like people you know.',
      messages: ['m9', 'm10', 'm11', 'm12'],
      spacing: 6,
    },
  ],
  messages: [
    {
      id: 'm1', creature: 'letter', threat: false, clues: [],
      fromName: 'Mayor Elara', fromAddress: 'elara@cybertown.gov',
      subject: 'Town fair: volunteers needed',
      body: 'Hello everyone! We need helpers for Saturday\'s fair. If you can spare an hour, add your name to the list on the Town Hall noticeboard. Thank you!',
      explain: 'Known sender on the town\'s real address, no links, and it asks for nothing sensitive.',
      hint: 'Check who really sent it and what it wants you to do.',
    },
    {
      id: 'm2', creature: 'parcel', threat: true, clues: ['sender', 'link', 'request', 'urgency'],
      fromName: 'CyberTown Post', fromAddress: 'notices@cybertown-post-delivery.co',
      subject: 'Parcel on hold: small fee required',
      body: 'Your parcel could not be delivered. Pay the 1.99 redelivery fee within 24 hours or it will be returned to the sender.',
      link: { text: 'Pay & track parcel', url: 'http://cybertown-post-delivery.co/pay' },
      explain: 'The address only looks official (cybertown-post-delivery.co is not cybertown.gov), the link leads to that same look-alike site, and it pushes you to pay quickly.',
      hint: 'Compare the sender\'s address with the town\'s real one, and look where the link really goes.',
    },
    {
      id: 'm3', creature: 'letter', threat: false, clues: [],
      fromName: 'Mr Rowan (Archive)', fromAddress: 'rowan@cybertown.gov',
      subject: 'Archive opening hours change',
      body: 'From next week the archive opens at 10:00 instead of 9:00. Nothing else changes.',
      explain: 'Genuine town address, a simple notice, no links and no requests.',
      hint: 'Is anything here asking you to click, pay or log in?',
    },
    {
      id: 'm4', creature: 'courier', threat: true, clues: ['sender', 'link', 'request'], stealsPassword: true,
      fromName: 'IT Help Desk', fromAddress: 'helpdesk@cybertown.gov.mailbox-check.net',
      subject: 'Your mailbox is almost full',
      body: 'Your mailbox has reached 98%. Confirm your login below to keep receiving messages.',
      link: { text: 'Keep my mailbox', url: 'https://cybertown.gov.mailbox-check.net/login' },
      explain: 'Read addresses from the end: this one belongs to mailbox-check.net, not cybertown.gov. Real IT never asks you to confirm your password through a link.',
      hint: 'Look at the very end of the sender\'s address, not the start.',
    },
    {
      id: 'm5', creature: 'letter', threat: true, clues: ['sender', 'request', 'urgency'],
      fromName: 'Mayor Elara', fromAddress: 'elara.mayor.office@freemail-box.com',
      subject: 'Quick favour, are you at your desk?',
      body: 'I\'m stuck in meetings. Can you buy four gift cards for the volunteers and send me the codes? I\'ll pay you back today. Please keep it between us for now.',
      explain: 'The name is right but the address is a free personal mailbox. Gift cards, secrecy and urgency are classic signs. Check with the Mayor through a channel you already know.',
      hint: 'The name can be anyone. What address is it really from, and is this a normal request?',
    },
    {
      id: 'm6', creature: 'letter', threat: false, clues: [],
      fromName: 'CyberTown Payroll', fromAddress: 'payroll@cybertown.gov',
      subject: 'Your December payslip is ready',
      body: 'Your payslip is in the staff portal as usual. We will never ask for your password by email.',
      link: { text: 'Staff portal', url: 'https://portal.cybertown.gov' },
      explain: 'Real town address and the link goes to the town\'s own portal. Even so, opening the portal from your bookmark is a good habit.',
      hint: 'Check where the link really leads.',
    },
    {
      id: 'm7', creature: 'parcel', threat: true, clues: ['sender', 'attachment', 'urgency'],
      fromName: 'Courier Express', fromAddress: 'tracking@courier-express-intl.cc',
      subject: 'Delivery attempt failed',
      body: 'We tried to deliver your parcel today. Print the attached label and bring it to the depot within 48 hours.',
      attachment: 'Delivery_Label.pdf.exe',
      explain: 'The attachment ends in .exe: it\'s a program pretending to be a PDF. Unexpected attachments from unknown senders are a common trap.',
      hint: 'Look closely at the attachment\'s full name.',
    },
    {
      id: 'm8', creature: 'letter', threat: false, clues: [],
      fromName: 'Town Hall Events', fromAddress: 'events@cybertown.gov',
      subject: 'Invite: safety briefing on Thursday',
      body: 'A short safety briefing in the Town Hall on Thursday at 14:00. It\'s already in your calendar.',
      explain: 'Genuine sender, expected kind of message, and no request for information.',
      hint: 'Anything unusual about the sender, links or requests?',
    },
    {
      id: 'm9', creature: 'courier', threat: true, clues: ['replyTo', 'request'], stealsPassword: true,
      fromName: 'Gus', fromAddress: 'gus@cybertown.gov', replyTo: 'gus.cybertown@outlook-mail.net',
      subject: 'Archive login?',
      body: 'Hey, my archive login expired. Could you reply with yours so I can finish the case file? Thanks!',
      explain: 'The sender looks right, but replies would go to an outside address, and nobody should ask for your password. Ask Gus in person.',
      hint: 'Where would your reply actually go? And should anyone ask for your login?',
    },
    {
      id: 'm10', creature: 'letter', threat: false, clues: [],
      fromName: 'CyberTown Security', fromAddress: 'security@cybertown.gov',
      subject: 'Reminder: we never ask for your password',
      body: 'A friendly reminder: we will never ask for your password. If something feels off, report it.',
      explain: 'Genuine. Security messages can look alarming, but this one asks you to do nothing risky.',
      hint: 'Does it ask you to click, pay or share anything?',
    },
    {
      id: 'm11', creature: 'courier', threat: true, clues: ['request', 'urgency'],
      fromName: 'Lantern & Co (supplier)', fromAddress: 'accounts@lantern-and-co.com',
      subject: 'Updated bank details for invoice #4471',
      body: 'Our bank has changed. Please pay invoice #4471 to the new account below today to avoid late fees.',
      explain: 'A sudden change of bank details is a classic fraud. Even from a known supplier, confirm by phone using a number you already have, not one in the email.',
      hint: 'Would you change where money goes because of one email?',
    },
    {
      id: 'm12', creature: 'letter', threat: false, clues: [],
      fromName: 'Mr Rowan (Archive)', fromAddress: 'rowan@cybertown.gov',
      subject: 'Case file: the missing letters',
      body: 'I\'ve shared the case file we talked about this morning.',
      link: { text: 'Open in CyberDrive', url: 'https://drive.cybertown.gov/case/missing-letters' },
      explain: 'Expected (you talked about it this morning), genuine sender, and the link goes to the town\'s own drive.',
      hint: 'Were you expecting it, and where does the link go?',
    },
  ],
};
