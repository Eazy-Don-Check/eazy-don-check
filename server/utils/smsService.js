const sendSms = async ({
to,
message,
}) => {
const provider =
String(
process.env.SMS_PROVIDER || ''
)
.trim()
.toLowerCase();

if (!provider) {
throw new Error(
'SMS_PROVIDER is not configured.'
);
}

if (provider !== 'termii') {
throw new Error(
`Unsupported SMS provider: ${provider}`
);
}

const apiKey =
process.env.TERMII_API_KEY;

const baseUrl =
process.env.TERMII_BASE_URL ||
'https://api.ng.termii.com';

const senderId =
process.env.TERMII_SENDER_ID ||
'EAZYDONCHECK';

if (!apiKey) {
throw new Error(
'TERMII_API_KEY is not configured.'
);
}

const response = await fetch(
`${baseUrl.replace(/\/+$/, '')}/api/sms/send`,
{
method: 'POST',

  headers: {
    'Content-Type':
      'application/json',
  },

  body: JSON.stringify({
    api_key: apiKey,
    to,
    from: senderId,
    sms: message,
    type: 'plain',
    channel: 'generic',
  }),
}

);

let data = null;

try {
data = await response.json();
} catch {
data = null;
}

if (!response.ok) {
throw new Error(
data?.message ||
data?.error ||
`SMS provider returned HTTP ${response.status}.`
);
}

if (
data?.code &&
String(data.code) !== '200'
) {
throw new Error(
data?.message ||
data?.error ||
'SMS provider rejected the request.'
);
}

return data;
};

module.exports = sendSms;