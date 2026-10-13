import { asyncHandler } from '../middlewares/error.middleware.js'
import { auth } from '../config/firebase.js'
import { ensureProfile } from '../services/user.service.js'

/**
 * POST /api/auth/facebook - Login với Facebook OAuth
 * Body: { facebookToken: string } - Access token từ Facebook
 */
export const facebookLogin = asyncHandler(async (req, res) => {
  const { facebookToken } = req.body ?? {}

  if (!facebookToken) {
    throw new Error('Thiếu facebookToken')
  }

  // Verify Facebook token and get user info
  const debugResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/debug?input_token=${facebookToken}`,
    {
      headers: { 'Accept': 'application/json' },
    }
  )

  const debugData = await debugResponse.json()

  if (debugData.data.is_valid !== true) {
    throw new Error('Facebook token không hợp lệ')
  }

  // Get user profile from Facebook
  const profileResponse = await fetch(
    `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture{url},first_name,last_name&access_token=${facebookToken}`,
    {
      headers: { 'Accept': 'application/json' },
    }
  )

  const profileData = await profileResponse.json()

  // Extract user info
  const { email, name, picture } = profileData
  const displayName = name || email?.split('@')[0] || 'Facebook User'

  // Tạo uid duy nhất từ email Facebook
  const uid = `fb_${email || Math.random().toString(36).substr(2, 9)}`

  // Tạo custom token cho Firebase
  const customToken = await auth.createCustomToken(uid, {
    email: email || `${uid}@facebook.com`,
    displayName,
    photoURL: picture?.data?.url,
    // Thêm provider info để phân biệt
    provider: 'facebook',
  })

  // Tạo/retrieve profile
  const profile = await ensureProfile({
    uid,
    email: email || `${uid}@facebook.com`,
    displayName,
    photoURL: picture?.data?.url,
  })

  res.json({
    user: profile,
    customToken,
    message: 'Đăng nhập Facebook thành công',
  })
})