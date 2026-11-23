<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class MailerAuthException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $statusCode = 422,
        public readonly bool $requiresReconnect = false,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }
}

