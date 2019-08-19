const { OAuth2Client } = require('google-auth-library')
const GOOGLE_SIGNIN_CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID

let ALLOWED_DOMAIN_LIST = []
if (process.env.GOOGLE_SIGNIN_ALLOWED_DOMAIN_LIST) {
  ALLOWED_DOMAIN_LIST = process.env.GOOGLE_SIGNIN_ALLOWED_DOMAIN_LIST.split(',')
}

async function authGoogle (idToken) {
  const googleOAuthClient = new OAuth2Client(GOOGLE_SIGNIN_CLIENT_ID)
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: idToken,
    audience: GOOGLE_SIGNIN_CLIENT_ID
  })

  const payload = ticket.getPayload()

  if (ALLOWED_DOMAIN_LIST.length > 0) {
    if (ALLOWED_DOMAIN_LIST.indexOf(payload.hd) === -1) {
      throw new Error(`invalid domain: ${payload.hd}`)
    }
  }

  const userID = payload['sub']
  const nickname = payload['email'].split('@')[0]
  return { id: userID, name: nickname }
}

module.exports = authGoogle
