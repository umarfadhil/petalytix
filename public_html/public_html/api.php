<?php
// Compatible with PHP 7.1

// Parse the URL part to be proxied
$url = str_replace('/' . basename(__FILE__), '', $_SERVER['REQUEST_URI']);
$requestMethod = $_SERVER["REQUEST_METHOD"]; // get the request method
$host = $_SERVER['HTTP_HOST'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$contentType = '';

$response = '';

function sendFormSummaryByEmail(array $formConfig, array $data, array $attachments)
{
    $formId = $formConfig['id'];
    $destinationEmail = $formConfig['form']['emailTo'] ? $formConfig['form']['emailTo'] : 'pety4436@petalytix.id';
    $senderEmail = $formConfig['form']['emailFrom'];
    $replyToEmail = null;
    $subject = $formConfig['form']['emailSubject'];
    $textHeader = $formConfig['form']['emailText'];
    $htmlSummary = '';
    $formData = $_POST['form_' . $formId];
    $formFieldsConfig = $formConfig['children'];

    foreach ($formFieldsConfig as $formFieldConfig) {
        $formItemConfig = $formFieldConfig['formItem'];
        $formFieldName = sprintf('ed-f-%d', $formFieldConfig['id']);
        if ($formItemConfig &&
            $formItemConfig['type'] == 'email' &&
            filter_var(
                $formData[$formFieldName],
                FILTER_VALIDATE_EMAIL
            ) !== false) {
            $replyToEmail = $formData[$formFieldName];
        }
    }

    foreach ($data as $label => $value) {
        if (is_array($value)) {
            $value = implode(',', $value);
        }
        if (strpos($label, 'ed-f') === 0) {
            $label = '';
        }
        $htmlSummary .= sprintf('<strong>%s</strong><br />%s<br /><br />', $label, $value);
    }

    foreach ($attachments as $label => $attachment) {
        if (strpos($label, 'ed-f') === 0) {
            $label = '';
        }
        $htmlSummary .= sprintf('<strong>%s</strong><br />%s<br /><br />', $label, $attachment['name']);
    }

    $mailBody = sprintf(
        "<html><body>%s<br/><br/>%s</body></html>",
        $textHeader,
        $htmlSummary
    );

    //header
    $headers = "MIME-Version: 1.0\r\n"; // Defining the MIME version
    if ($senderEmail) {
        $headers .= "From: $senderEmail" . "\r\n"; // Sender Email
    }
    if ($replyToEmail) {
        $headers .= "Reply-To: $replyToEmail" . "\r\n"; // Email address to reach back
    }
    if ($formConfig['form']['sendCsv']) {
        $attachments[] = [
            'type' => 'text/csv',
            'name' => 'form-data.csv',
            'data' => createCsvData($data)
        ];
    }

    if (count($attachments)) {
        $boundary = md5("boundary"); // define boundary with a md5 hashed value
        $headers .= "Content-Type: multipart/mixed;"; // Defining Content-Type
        $headers .= "boundary = $boundary" . "\r\n"; //Defining the Boundary

        //html
        $body = "--$boundary\r\n";
        $body .= "Content-type: text/html; charset=utf-8" . "\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($mailBody));

        //attachment
        foreach ($attachments as $attachment) {
            $fileType = $attachment['type'];
            $fileName = $attachment['name'];

            $fileContent = $attachment['data'] ?? file_get_contents($attachment['tempFile']);
            $encodedFileContent = chunk_split(base64_encode($fileContent));

            $body .= "--$boundary\r\n";
            $body .= "Content-Type: $fileType; name=" . $fileName . "\r\n";
            $body .= "Content-Disposition: attachment; filename=" . $fileName . "\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "X-Attachment-Id: " . rand(1000, 99999) . "\r\n\r\n";
            $body .= $encodedFileContent; // Attaching the encoded file with email
        }

        $mailBody = $body;
    } else {
        $headers .= "Content-type: text/html; charset=utf-8" . "\r\n";
    }

    return mail($destinationEmail, $subject, $mailBody, $headers, $senderEmail ? "-f $senderEmail" : "");
}

function createCsvData(array $data): string
{
    $headers = [];
    $values = [];
    $delimiter = ';';
    $enclosure = '"';

    foreach ($data as $label => $value) {
        $headers[] = str_replace($enclosure, '\\' . $enclosure, $label);
        $values[] = str_replace($enclosure, '\\' . $enclosure, is_array($value) ? implode(',', $value) : $value);
    }

    return $enclosure . implode(
        $enclosure . $delimiter . $enclosure,
        $headers
    ) . $enclosure . "\n" . $enclosure . implode(
        $enclosure . $delimiter . $enclosure,
        $values
    ) . $enclosure;
}

function getFormData($formId, $formFieldsConfig): array
{
    $data = [];
    $attachments = [];
    $formData = $_POST['form_' . $formId];
    $formFiles = isset($_FILES['form_' . $formId]) ? $_FILES['form_' . $formId] : [];

    foreach ($formFieldsConfig as $formFieldConfig) {
        $formItemConfig = $formFieldConfig['formItem'];
        if (!$formItemConfig || in_array($formItemConfig['type'], ['captcha', 'button'])) {
            continue;
        }

        $formFieldName = sprintf('ed-f-%d', $formFieldConfig['id']);
        $id = $formFieldConfig['id'];
        $placeholder = null;
        $label = null;
        $multiple = false;
        foreach ($formItemConfig['values'] as $attributeValue) {
            if ($attributeValue['attribute'] == 14) { // placeholder
                $placeholder = $attributeValue['value'];
            }
            if ($attributeValue['attribute'] == 2) { // label
                $label = $attributeValue['value'];
            }
            if ($attributeValue['attribute'] == 29) { // select-multiple
                $multiple = (bool)$attributeValue['value'];
            }
        }

        if (!$label) {
            $label = $placeholder ?: $formFieldName;
        }


        if ($formItemConfig['type'] === 'upload' && file_exists($formFiles['tmp_name'][$formFieldName])) {
            $attachments[$label] = [
                'name' => $formFiles['name'][$formFieldName],
                'type' => $formFiles['type'][$formFieldName],
                'tempFile' => $formFiles['tmp_name'][$formFieldName]
            ];
        } elseif ($formItemConfig['type'] === 'checkbox') {
            $submittedData = $formData[$formFieldName] ? array_diff($formData[$formFieldName], ['']) : [];
            $data[$label] = [];
            foreach ($submittedData as $itemSortOrder) {
                foreach ($formItemConfig['choices'] as $selectChoice) {
                    if ((string)$itemSortOrder === (string)$selectChoice['sort']) {
                        $data[$label][$itemSortOrder] = $selectChoice['value'];
                    }
                }
            }
            $data[$label] = implode(',', $data[$label]);
        } elseif ($formItemConfig['type'] === 'radio') {
            foreach ($formItemConfig['choices'] as $selectChoice) {
                if ($formData[$formFieldName] == $selectChoice['sort']) {
                    $data[$label] = $selectChoice['value'];
                    break;
                }
            }
            continue;
        } elseif ($formItemConfig['type'] === 'select') {
            if ($multiple) {
                $submittedData = isset($formData[$formFieldName]) ? array_diff($formData[$formFieldName], ['']) : [];
                $data[$label] = [];
                foreach ($submittedData as $itemSortOrder) {
                    foreach ($formItemConfig['choices'] as $selectChoice) {
                        if ((string)$itemSortOrder === (string)$selectChoice['sort']) {
                            $data[$label][$itemSortOrder] = $selectChoice['value'];
                        }
                    }
                }
                $data[$label] = implode(',', $data[$label]);
            } else {
                $submittedData = isset($formData[$formFieldName]) ? $formData[$formFieldName] : null;
                $data[$label] = [];
                foreach ($formItemConfig['choices'] as $selectChoice) {
                    if ((string)$submittedData === (string)$selectChoice['sort']) {
                        $data[$label] = $selectChoice['value'];
                        break;
                    }
                }
                continue;
            }
        } elseif (isset($formData[$formFieldName])) {
            $data[$label] = $formData[$formFieldName];
        }
    }

    return [$data, $attachments];
}

function handleFormSubmission()
{
    $apiHost = 'https://api.sitehub.io';
    $httpCode = 400;
    $isValid = false;
    $response = false;

    if (isset($_POST['id'])) {
        $formId = $_POST['id'];
        $json = curl(
            sprintf('%s/website/elements/%d', $apiHost, $formId)
        );
        $formConfig = json_decode($json, true);
        $sendMail = $formConfig['form']['sendEmail'];

        foreach ($_POST['form_' . $formId] as $fieldData) {
            if (is_array($fieldData)) {
                if (isset($fieldData['hash']) && isset($fieldData['text'])) {
                    $clean = strtoupper(trim((string)$fieldData['text']));
                    $hashedText = hash('sha256', $clean);
                    if ($hashedText !== $fieldData['hash']) {
                        $isValid = false;
                        $httpCode = 400;
                        $response = 'Wrong security code';
                        break;
                    } else {
                        $isValid = true;
                        $httpCode = 200;
                        $response = sprintf(
                            '<div class="wv-message wv-success">%s</div>',
                            $formConfig['form']['successMessage']
                        );
                    }
                }
            }
        }

        if ($isValid) {
            $formFieldsConfig = $formConfig['children'];
            list($data, $attachments) = getFormData($formId, $formFieldsConfig);

            if ($formConfig['form']['webhookUrl']) {
                pushWebhook($formConfig, $data, $attachments);
            }

            if ($formConfig['form']['redirectTo'] && is_string($formConfig['form']['redirectTo'])) {
                $response = '<script type="text/javascript">window.setTimeout(function() { window.location.href=' . json_encode($formConfig['form']['redirectTo']) . '; }, 1000);</script>';
                $httpCode = 200;
            }

            if ($sendMail) {
                if (!sendFormSummaryByEmail($formConfig, $data, $attachments)) {
                    $response = 'Could not send e-mail';
                    $httpCode = 400;
                }
            }
        }
    }

    return [$response, ['http_code' => $httpCode]];
}

function pushWebhook($formConfig, array $data, array $attachments)
{
    $formId = $formConfig['id'];
    $formName = $formConfig['form']['name'];

    foreach ($attachments as $label => $fileData) {
        $data[$label] = [
            'name' => $fileData['name'],
            'type' => $fileData['type'],
            'body' => filesize($fileData['tempFile']) < 1024 * 1024 * 1024 ? base64_encode(file_get_contents($fileData['tempFile'])) : 'too_large',
        ];
    }

    $payload = http_build_query([
        'data' => json_encode($data),
        'form_id' => $formId,
        'form_name' => $formName,
        'submitted_at' => date('r')
    ]);

    $ch = curl_init($formConfig['form']['webhookUrl']);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt(
        $ch,
        CURLOPT_HTTPHEADER,
        ['Content-Length: ' . strlen($payload)]
    );

    curl_exec($ch);
}

function forwardToApi($url, $requestMethod, $postData = null)
{
    $apiHost = 'https://api.sitehub.io';
    // Check if the request has a content type header
    if (isset($_SERVER["CONTENT_TYPE"])) {
        // Parse the content type and get the type and charset
        $contentTypeParts = explode(';', $_SERVER["CONTENT_TYPE"]);
        $contentType = $contentTypeParts[0];
    }

    // Set the Sitejet API endpoint
    $apiUrl = (strpos($url, '/images') === 0 ? 'https://inter-cdn.com' : $apiHost) . $url;

    // Open the cURL session
    $ch = curl_init();

    // Set the cURL options
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    // Set the request method
    if ($requestMethod == "POST") {
        $postData = $postData ?: $_POST;
        curl_setopt($ch, CURLOPT_POST, true); // sets the request method to POST

        // Check the content type and set the appropriate option for cURL
        switch ($contentType) {
            case "application/json":
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json; charset=UTF-8']);
                curl_setopt(
                    $ch,
                    CURLOPT_POSTFIELDS,
                    file_get_contents('php://input')
                ); // set the JSON content in the body
                break;
            case "multipart/form-data":
                curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                break;
            default:
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
                break;
        }
    }

    // Execute the cURL request
    $response = curl_exec($ch);

    // Get the response headers and status code
    $headers = curl_getinfo($ch);

    // Close the cURL session
    curl_close($ch);

    return [$response, $headers];
}

function curl($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $return = curl_exec($ch);
    curl_close($ch);
    return $return;
}

if ($requestMethod == 'POST' && strpos($url, '/form_container/submit') !== false) {
    list($response, $headers) = handleFormSubmission();
} else {
    list($response, $headers) = forwardToApi($url, $requestMethod);

    // Set the content type based on the response headers
    $contentType = $headers['content_type'] ? $headers['content_type'] : 'text/plain';

    // Set the response headers for the client
    header('Content-Type: ' . $contentType);

    $cdnHosts = [
        'https://inter-cdn.com',
        'https://cdn1.site-media.eu',
        'https://cdn2.site-media.eu',
        'https://cdn3.site-media.eu',
        'https://cdn4.site-media.eu',
        'https://cdn5.site-media.eu',
        'https://cdn6.site-media.eu',
        'https://cdn7.site-media.eu',
        'https:\/\/inter-cdn.com',
        'https:\/\/cdn1.site-media.eu',
        'https:\/\/cdn2.site-media.eu',
        'https:\/\/cdn3.site-media.eu',
        'https:\/\/cdn4.site-media.eu',
        'https:\/\/cdn5.site-media.eu',
        'https:\/\/cdn6.site-media.eu',
        'https:\/\/cdn7.site-media.eu'
    ];
    $response = str_replace($cdnHosts, '/api.php', $response);
}

if (isset($headers['http_code'])) {
    http_response_code($headers['http_code']);
}
// Output the response to the client
echo $response;
