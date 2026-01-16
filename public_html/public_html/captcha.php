<?php
session_start();
$code = substr(str_shuffle("ABCDEFGHJKLMNPQRSTUVWXYZ123456789"), 0, 5);
$_SESSION['captcha'] = $code;

header('Content-Type: image/png');
$image = imagecreate(100, 30);
$bg = imagecolorallocate($image, 255, 255, 255);
$textcolor = imagecolorallocate($image, 0, 0, 0);
imagestring($image, 5, 15, 7, $code, $textcolor);
imagepng($image);
imagedestroy($image);
