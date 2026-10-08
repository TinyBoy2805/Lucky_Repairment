const MESSAGES = {
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
  'auth/user-not-found': 'Email chưa được đăng ký.',
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'auth/email-already-in-use': 'Email này đã được sử dụng.',
  'auth/too-many-requests':
    'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.',
  'auth/network-request-failed': 'Lỗi kết nối mạng. Kiểm tra Internet của bạn.',
  'auth/operation-not-allowed':
    'Phương thức đăng nhập này chưa được bật. Vào Firebase Console → Authentication → Sign-in method, bật Google (hoặc Email/Password).',
  'auth/account-exists-with-different-credential':
    'Email này đã được đăng ký bằng mật khẩu. Hãy đăng nhập bằng email + mật khẩu.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/unauthorized-domain':
    'Miền này chưa được phép. Thêm localhost:5173 vào Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/invalid-api-key': 'API key Firebase không hợp lệ. Kiểm tra lại cấu hình.',
  'auth/requires-recent-login':
    'Thao tác này yêu cầu đăng nhập lại. Vui lòng đăng nhập rồi thử lại.',
}

/** Dịch lỗi Firebase/API sang tiếng Việt. */
export function authErrorMessage(error) {
  if (!error) return 'Có lỗi xảy ra.'
  return MESSAGES[error.code] ?? error.message ?? 'Có lỗi xảy ra.'
}
