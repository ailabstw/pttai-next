const { OAuth2Client } = require('google-auth-library')
const GOOGLE_SIGNIN_CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID

async function authGoogle (idToken) {
  const googleOAuthClient = new OAuth2Client(GOOGLE_SIGNIN_CLIENT_ID)
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: idToken,
    audience: GOOGLE_SIGNIN_CLIENT_ID
  })
  const payload = ticket.getPayload()
  let userID = payload['sub']
  return userID
}

module.exports = authGoogle
