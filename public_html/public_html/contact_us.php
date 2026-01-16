<?php
session_start();
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';


// Ambil data dari form
$name     = $_POST['name'];
$email    = $_POST['email'];
$phone    = $_POST['phone'];
$company  = $_POST['company'];
$message  = $_POST['message'];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $mail = new PHPMailer(true);

    try {
        // Konfigurasi SMTP
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.example.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER') ?: 'user@example.com';
        $mail->Password   = getenv('SMTP_PASS') ?: '';
        $mail->SMTPSecure = (getenv('SMTP_SECURE') === 'true')
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) (getenv('SMTP_PORT') ?: 465);
    
        // Pengirim & Penerima
        $mail->setFrom(
            getenv('SMTP_FROM') ?: $mail->Username,
            'Petalytix Contact Form'
        );
        $mail->addAddress(
            getenv('CONTACT_TO') ?: $mail->Username,
            'Petalytix Admin'
        ); // penerima
        $mail->addReplyTo($email, $name); // reply langsung ke pengirim form 
    
        // Konten email
        $mail->isHTML(true);
        $mail->Subject = 'Pesan Baru dari Form Kontak';
        $mail->Body    = "
            <h3>Detail Pesan:</h3>
            <p><b>Nama:</b> {$name}</p>
            <p><b>Email:</b> {$email}</p>
            <p><b>Kontak:</b> {$phone}</p>
            <p><b>Perusahaan:</b> {$company}</p>
            <p><b>Pesan:</b><br>{$message}</p>
        ";
    
        $mail->send();
        echo "Pesan berhasil dikirim.";
    } catch (Exception $e) {
        echo "Mailer Error: {$mail->ErrorInfo}";
    }
} else {
    echo "Invalid request";
}
