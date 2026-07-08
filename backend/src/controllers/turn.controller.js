import crypto from "crypto";

const TTL_SECONDS = 3600; // credentials are valid for 1 hour

// This follows the widely-used coturn "REST API" auth scheme: the
// username is a future expiry timestamp, and the credential is an HMAC of
// that username keyed by a secret shared with the TURN server (coturn's
// `use-auth-secret` + `static-auth-secret` config directives). Nobody gets
// a permanent password baked into client code — a leaked credential is
// only useful for an hour.
export function getTurnCredentials(req, res) {
  const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const username = `${expiry}`;

  const hmac = crypto.createHmac("sha1", process.env.TURN_SECRET);
  hmac.update(username);
  const credential = hmac.digest("base64");

  res.json({
    username,
    credential,
    ttl: TTL_SECONDS,
    urls: (process.env.TURN_SERVER_URLS || "turn:localhost:3478").split(","),
  });
}
