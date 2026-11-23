<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_smtp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->string('host');
            $table->unsignedInteger('port')->default(587);
            $table->string('encryption', 10)->nullable();
            $table->string('username');
            $table->text('password');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_smtp_settings');
    }
};

