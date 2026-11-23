<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\Guest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GuestInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event $event,
        public Guest $guest,
        public string $rsvpUrl,
        public ?string $fromEmail = null,
        public ?string $fromName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: $this->fromEmail ? new Address($this->fromEmail, $this->fromName) : null,
            subject: "Invitación: {$this->event->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.guest-invitation',
        );
    }
}
