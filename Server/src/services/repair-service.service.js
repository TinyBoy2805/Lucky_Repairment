import { firestore } from '../config/firebase.js'
import { badRequest, conflict, notFound } from '../utils/http-error.js'

export const INITIAL_SERVICES = [
  {
    id: 'sua-chap-dien',
    title: 'Dịch vụ Xử Lý Chập Điện & Khắc Phục Mất Điện Cục Bộ',
    category: 'electric',
    categoryName: 'Sửa Chữa Điện',
    startingPrice: 200000,
    priceDisplay: 'Từ 200.000 đ',
    responseTime: '15 - 30 phút',
    warranty: '6 tháng',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Tìm và xử lý dứt điểm điểm chập cháy ngầm, nhảy aptomat liên tục, đứt dây âm tường bằng máy đo chuyên dụng an toàn.',
    description: `Sự cố chập cháy điện là một trong những mối nguy hiểm hàng đầu đe dọa đến an toàn tính mạng và tài sản trong gia đình. Đội ngũ thợ kỹ thuật của Lucky Repairment được trang bị đồng hồ đo cách điện Megohmmeter và máy dò điểm chập ngầm công nghệ cao, giúp xác định chính xác vị trí chập điện âm tường mà không cần đục phá lan man, xử lý triệt để nguyên nhân gốc rễ và phục hồi nguồn điện an toàn trong thời gian ngắn nhất.`,
    signs: [
      'Aptomat tự động nhảy liên tục, bật lại là nhảy ngay kèm tiếng nổ lẹt đẹt hoặc mùi khét',
      'Mất điện một phòng, một tầng hoặc toàn bộ nhà trong khi các hộ xung quanh vẫn có điện',
      'Ổ cắm, công tắc bị đen sạm, nóng rát hoặc chảy nhựa khi cắm thiết bị',
      'Sờ vào vỏ kim loại của tủ lạnh, bình nóng lạnh, máy giặt bị tê giật',
      'Dây điện âm tường bị quá tải bốc khói hoặc cháy đứt bên trong',
    ],
    process: [
      {
        step: 1,
        title: 'Tiếp nhận & Hướng dẫn an toàn khẩn cấp',
        desc: 'Tư vấn khách hàng ngắt cầu dao tổng ngay lập tức để phòng ngừa cháy nổ và điều phối thợ gần nhất di chuyển tới sau 15–30 phút.',
      },
      {
        step: 2,
        title: 'Khảo sát & Dò tìm điểm chập',
        desc: 'Sử dụng máy đo chuyên dụng đo thông mạch, điện trở cách điện để định vị chính xác vị trí bị chập hoặc rò rỉ điện.',
      },
      {
        step: 3,
        title: 'Báo giá minh bạch & Xử lý sự cố',
        desc: 'Thông báo rõ nguyên nhân và chi phí khắc phục. Khách hàng đồng ý thợ mới tiến hành thay thế dây dẫn cháy, cách điện an toàn.',
      },
      {
        step: 4,
        title: 'Đo kiểm tải & Kích hoạt bảo hành',
        desc: 'Chạy thử với các thiết bị công suất lớn, đo dòng tải ampe thực tế, dọn dẹp hiện trường và bàn giao phiếu bảo hành 6 tháng.',
      },
    ],
    priceList: [
      { item: 'Khảo sát & kiểm tra sự cố chập điện', unit: 'Lần', price: '100.000 đ (Miễn phí nếu sửa)' },
      { item: 'Xử lý chập điện nổi (dễ tiếp cận)', unit: 'Điểm', price: '200.000 - 300.000 đ' },
      { item: 'Dò tìm & xử lý chập điện ngầm âm tường/trần thạch cao', unit: 'Điểm', price: '350.000 - 550.000 đ' },
      { item: 'Rút & luồn lại đường dây điện âm tường bị cháy đứt', unit: 'Mét', price: '60.000 - 90.000 đ' },
      { item: 'Cân pha, tách tải tủ điện gia đình 3 pha', unit: 'Hệ thống', price: '300.000 - 500.000 đ' },
    ],
  },
  {
    id: 'sua-may-bom-nuoc',
    title: 'Dịch vụ Sửa Chữa & Lắp Đặt Máy Bơm Nước Tận Nhà',
    category: 'water',
    categoryName: 'Sửa Chữa Nước',
    startingPrice: 180000,
    priceDisplay: 'Từ 180.000 đ',
    responseTime: '15 - 30 phút',
    warranty: '6 - 12 tháng',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Khắc phục máy bơm kêu to, chạy không lên nước, rò rỉ điện, cháy tụ hoặc thay lắp rơ-le tăng áp tự động.',
    description: `Máy bơm nước đóng vai trò huyết mạch trong việc cung cấp nước sinh hoạt cho gia đình. Lucky Repairment chuyên nhận sửa chữa tất cả các dòng máy bơm đẩy cao, máy bơm tăng áp điện tử, máy bơm ly tâm của các hãng Panasonic, Hanil, Wilo, Shimizu... Xử lý nhanh các pan bệnh thường gặp: hỏng phớt nước, kẹt cánh bơm, cháy cuộn dây stato, hỏng tụ khởi động.`,
    signs: [
      'Máy bơm vẫn có điện vào, có tiếng vo ve nhưng động cơ không quay',
      'Máy bơm chạy liên tục không tự ngắt khiến nóng ran hoặc tràn nước bể chứa',
      'Máy bơm chạy ồn ào, rung lắc mạnh và phát ra tiếng kêu rít chói tai',
      'Máy bơm hoạt động bình thường nhưng không thấy nước bơm lên bồn chứa',
      'Rơ-le máy bơm tăng áp đóng ngắt tạch tạch liên tục không ngừng',
    ],
    process: [
      {
        step: 1,
        title: 'Kiểm tra hiện trạng & Đo đạc',
        desc: 'Kiểm tra nguồn điện cấp, van hút, buồng chứa cánh bơm, rơ-le áp suất và đường ống hút nước.',
      },
      {
        step: 2,
        title: 'Chẩn đoán hư hỏng & Báo chi phí',
        desc: 'Chỉ rõ linh kiện bị hao mòn (phớt nước, cánh bơm, tụ điện, bạc đạn) và báo giá thay thế chính hãng.',
      },
      {
        step: 3,
        title: 'Sửa chữa & Thay thế phụ tùng',
        desc: 'Vệ sinh buồng bơm, thay phớt chống rò nước, thay tụ hoặc căn chỉnh lại rơ-le tăng áp.',
      },
      {
        step: 4,
        title: 'Vận hành thử nghiệm & Bàn giao',
        desc: 'Đo áp lực nước đầu ra, kiểm tra độ êm của động cơ và viết phiếu bảo hành từ 6 đến 12 tháng.',
      },
    ],
    priceList: [
      { item: 'Kiểm tra & mồi nước, thông tắc rác buồng bơm', unit: 'Lần', price: '150.000 - 200.000 đ' },
      { item: 'Thay phớt chặn nước máy bơm (chống rò rỉ)', unit: 'Bộ', price: '200.000 - 300.000 đ' },
      { item: 'Thay tụ đề khởi động máy bơm', unit: 'Chiếc', price: '180.000 - 250.000 đ' },
      { item: 'Thay rơ-le áp lực máy bơm tăng áp cơ/điện tử', unit: 'Chiếc', price: '220.000 - 380.000 đ' },
      { item: 'Lắp đặt máy bơm nước mới hoàn chỉnh', unit: 'Máy', price: '250.000 - 350.000 đ' },
    ],
  },
  {
    id: 'ro-ri-ong-nuoc',
    title: 'Dịch vụ Dò Tìm Rò Rỉ & Sửa Đường Ống Nước Bục Vỡ',
    category: 'water',
    categoryName: 'Sửa Chữa Nước',
    startingPrice: 250000,
    priceDisplay: 'Từ 250.000 đ',
    responseTime: '20 - 30 phút',
    warranty: '12 tháng',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Dò tìm điểm rò rỉ đường ống nước ngầm gây tăng hóa đơn tiền nước, xử lý triệt để bục vỡ ống cấp thoát nước.',
    description: `Đường ống nước ngầm bị nứt vỡ hoặc rò rỉ mối nối không chỉ gây lãng phí hàng chục khối nước mỗi tháng mà còn gây ẩm mốc, sụt lún kết cấu nền nhà. Đội thợ chuyên nghiệp của chúng tôi áp dụng máy khuếch đại âm dò rỉ nước mặt đất và thiết bị đo áp suất đường ống để khoanh vùng điểm bục vỡ với độ chính xác cao nhất, giảm thiểu tối đa việc đục phá nền nhà.`,
    signs: [
      'Hóa đơn tiền nước tăng đột biến gấp nhiều lần dù nhu cầu sử dụng không đổi',
      'Đã khóa toàn bộ vòi nước trong nhà nhưng kim đồng hồ nước vẫn tiếp tục quay',
      'Áp lực nước tại các vòi sen, vòi chậu bị yếu đi bất thường',
      'Chân tường, sàn nhà bị ẩm ướt, mọc rêu xanh hoặc rỉ nước liên tục',
      'Máy bơm tăng áp tự động khởi động cách quãng dù không có ai mở nước',
    ],
    process: [
      {
        step: 1,
        title: 'Khóa nguồn nước & Đo áp suất',
        desc: 'Cách ly từng nhánh đường ống và bơm áp lực để xác định đoạn ống đang bị sụt áp.',
      },
      {
        step: 2,
        title: 'Dò tìm bằng thiết bị siêu âm',
        desc: 'Định vị chính xác điểm rò rỉ âm sàn hoặc trong hộp kỹ thuật mà không cần đào bới diện rộng.',
      },
      {
        step: 3,
        title: 'Cắt nối & Thay thế ống mới',
        desc: 'Sử dụng ống và phụ kiện nhiệt PPR hoặc PVC chất lượng cao của Tiền Phong, hàn nhiệt chắc chắn.',
      },
      {
        step: 4,
        title: 'Thử áp lực ngâm nước & Hoàn trả mặt bằng',
        desc: 'Bơm nén áp suất trong 30 phút để đảm bảo không rò rỉ, trát vá lại gạch sàn thẩm mỹ.',
      },
    ],
    priceList: [
      { item: 'Dò tìm điểm rò rỉ nước ngầm nhà dân (dưới 3 tầng)', unit: 'Điểm', price: '400.000 - 800.000 đ' },
      { item: 'Sửa đường ống nước lộ bên ngoài bị rò rỉ', unit: 'Điểm', price: '150.000 - 250.000 đ' },
      { item: 'Đục sửa & thay đoạn ống ngầm bị bục vỡ', unit: 'Điểm', price: '300.000 - 500.000 đ' },
      { item: 'Thay thế van khóa nước tổng bị kẹt hoặc gãy', unit: 'Chiếc', price: '180.000 - 250.000 đ' },
    ],
  },
  {
    id: 'thong-tac-cong-bon-cau',
    title: 'Dịch vụ Thông Tắc Bồn Cầu, Chậu Rửa Bát & Cống Nghẹt',
    category: 'water',
    categoryName: 'Sửa Chữa Nước',
    startingPrice: 200000,
    priceDisplay: 'Từ 200.000 đ',
    responseTime: '15 - 30 phút',
    warranty: '3 tháng',
    image: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Thông tắc cống thoát sàn, chậu rửa chén, bồn cầu bằng máy lò xo và máy nén khí áp lực cao, không đục phá.',
    description: `Tắc nghẽn bồn cầu, chậu rửa bát và cống thoát nước sinh hoạt gây mùi hôi khó chịu và làm đảo lộn sinh hoạt của gia đình bạn. Lucky Repairment áp dụng công nghệ thông cống bằng máy lò xo xoắn đa năng và máy nén khí công suất cao, đánh tan toàn bộ cặn mỡ dầu thừa, tóc và dị vật ứ đọng trong đường ống chỉ sau 20 phút mà không gây nứt vỡ sứ vệ sinh hay đường ống.`,
    signs: [
      'Nước xả bồn cầu xoáy chậm hoặc không trôi, có hiện tượng dềnh nước lên',
      'Chậu rửa chén bát bị ứ đọng nước, mở nước là trào ngược lên sàn nhà',
      'Đường thoát sàn nhà tắm có mùi hôi nồng nặc và nước thoát rất rề rà',
      'Nghe thấy tiếng ục ục phát ra từ đường ống cống thoát nước',
    ],
    process: [
      {
        step: 1,
        title: 'Khảo sát độ nghẹt & Vị trí tắc',
        desc: 'Kiểm tra đường ống thoát, xác định nguyên nhân tắc do dầu mỡ, tóc hay dị vật rơi vào.',
      },
      {
        step: 2,
        title: 'Lựa chọn phương án & Báo giá',
        desc: 'Lựa chọn đầu dây lò xo phù hợp kích thước ống và báo giá trọn gói không phát sinh.',
      },
      {
        step: 3,
        title: 'Thông nghẹt bằng máy lò xo công nghệ cao',
        desc: 'Luồn dây xoắn đánh tan dầu mỡ bám quanh thành ống và lôi dị vật ra ngoài triệt để.',
      },
      {
        step: 4,
        title: 'Xả nước thử tải & Khử mùi diệt khuẩn',
        desc: 'Xả liên tục lượng nước lớn để kiểm tra độ thông thoát và vệ sinh sạch sẽ khu vực làm việc.',
      },
    ],
    priceList: [
      { item: 'Thông tắc bồn cầu bị nghẹt giấy/dị vật nhẹ', unit: 'Lần', price: '200.000 - 300.000 đ' },
      { item: 'Thông tắc chậu rửa bát bị đóng cặn mỡ lâu ngày', unit: 'Lần', price: '250.000 - 350.000 đ' },
      { item: 'Thông tắc cống thoát sàn nhà vệ sinh bằng máy lò xo', unit: 'Mét/Lần', price: '250.000 - 400.000 đ' },
      { item: 'Tháo dỡ bồn cầu để lấy dị vật cứng rơi sâu', unit: 'Lần', price: '350.000 - 500.000 đ' },
    ],
  },
  {
    id: 'thay-aptomat-o-cam',
    title: 'Dịch vụ Thay Thế & Lắp Đặt Aptomat, Ổ Cắm, Công Tắc Điện',
    category: 'electric',
    categoryName: 'Sửa Chữa Điện',
    startingPrice: 80000,
    priceDisplay: 'Từ 80.000 đ',
    responseTime: '15 - 30 phút',
    warranty: '12 tháng',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Thay mới aptomat chống giật RCBO, ổ cắm âm tường chống cháy, công tắc đèn thẩm mỹ và đúng chuẩn kỹ thuật.',
    description: `Ổ cắm điện lỏng lẻo, aptomat cũ kỹ kém nhạy là nguyên nhân tiềm ẩn gây phát tia lửa điện và nguy hiểm cho trẻ nhỏ. Chúng tôi cung cấp dịch vụ thay thế và lắp đặt các thiết bị đóng cắt an toàn, aptomat chống giật, ổ cắm chống cháy của các thương hiệu hàng đầu như Panasonic, Schneider, Sino. Kỹ thuật viên thi công cẩn thận, đo tiếp xúc đồng chắc chắn và đảm bảo tính thẩm mỹ cao cho căn phòng.`,
    signs: [
      'Cắm phích cắm vào ổ bị lỏng lẻo, chập chờn, phát ra tia lửa xẹt xẹt',
      'Aptomat cũ bị kẹt cần gạt, nóng ấm khi sử dụng nhiều thiết bị',
      'Công tắc bật đèn bị lờn, phát ra tiếng nổ nhỏ bên trong',
      'Muốn nâng cấp lắp thêm aptomat chống rò giật RCBO cho gia đình có trẻ em',
    ],
    process: [
      {
        step: 1,
        title: 'Ngắt nguồn điện cục bộ & Kiểm tra an toàn',
        desc: 'Kiểm tra bút thử điện đảm bảo không còn điện thế nguy hiểm trước khi mở mặt che.',
      },
      {
        step: 2,
        title: 'Tháo dỡ thiết bị cũ',
        desc: 'Cắt tỉa lại đầu dây đồng bị oxy hóa, bấm đầu cos nếu cần để tiếp xúc tốt nhất.',
      },
      {
        step: 3,
        title: 'Lắp ráp thiết bị mới',
        desc: 'Siết chặt vít đấu nối đúng cực L-N, lắp mặt che phẳng phiu và vuông vắn với tường.',
      },
      {
        step: 4,
        title: 'Kiểm tra hoạt động & Bàn giao',
        desc: 'Đo điện áp và thử tải thiết bị để đảm bảo hoạt động an toàn tuyệt đối.',
      },
    ],
    priceList: [
      { item: 'Thay thế công tắc, ổ cắm điện đơn/đôi', unit: 'Điểm', price: '80.000 - 120.000 đ' },
      { item: 'Thay aptomat 1 pha (tép MCB)', unit: 'Cái', price: '100.000 - 150.000 đ' },
      { item: 'Lắp đặt Aptomat chống rò giật (RCBO)', unit: 'Cái', price: '150.000 - 200.000 đ' },
      { item: 'Lắp thêm ổ cắm điện mới kéo dây nổi/ghen', unit: 'Điểm', price: '150.000 - 250.000 đ' },
    ],
  },
  {
    id: 'lap-binh-nong-lanh',
    title: 'Dịch vụ Lắp Đặt & Bảo Dưỡng, Sửa Bình Nóng Lạnh',
    category: 'water',
    categoryName: 'Sửa Chữa Nước',
    startingPrice: 150000,
    priceDisplay: 'Từ 150.000 đ',
    responseTime: '20 - 30 phút',
    warranty: '6 tháng',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Xúc xả cặn vôi, thay thanh magie, sửa bình không nóng, thay dây cấp nước và lắp đặt bình nóng lạnh an toàn.',
    description: `Bình nóng lạnh sau 1-2 năm sử dụng thường bị đóng cặn canxi dày đặc khiến nước lâu sôi, tốn điện và tiềm ẩn rò rỉ điện ra nguồn nước cực kỳ nguy hiểm. Lucky Repairment cung cấp trọn gói dịch vụ vệ sinh súc rửa bình, thay thanh khử cặn Magie và kiểm tra rơ-le chống giật ELCB, đảm bảo nguồn nước tắm luôn sạch sẽ và an toàn tuyệt đối cho cả gia đình.`,
    signs: [
      'Bật bình nóng lạnh rất lâu nhưng nước chỉ ấm nhẹ, không đủ độ nóng',
      'Bình nóng lạnh bị rò rỉ nước ở chân van xả hoặc rỉ nước từ thân bình',
      'Nước chảy từ vòi nóng có cặn bẩn màu vàng đục hoặc có mùi lạ',
      'Đèn báo nguồn bình nóng lạnh không sáng hoặc nhảy cục chống giật ELCB',
    ],
    process: [
      {
        step: 1,
        title: 'Ngắt điện, khóa nước & Tháo bình',
        desc: 'Xả sạch nước trong bình và tháo bình xuống vị trí an toàn để kiểm tra ruột bình.',
      },
      {
        step: 2,
        title: 'Tháo thanh đốt & Súc rửa cặn canxi',
        desc: 'Đánh sạch cặn bám trên thanh đốt nhiệt, sục rửa sạch ruột bình bằng dung dịch chuyên dụng.',
      },
      {
        step: 3,
        title: 'Thay thanh Magie & Kiểm tra gioăng cao su',
        desc: 'Thay thanh Magie mới để chống ăn mòn ruột bình, thay gioăng cao su chịu nhiệt chống rò rỉ.',
      },
      {
        step: 4,
        title: 'Treo bình, cấp nước & Thử chống giật',
        desc: 'Cấp nước đầy bình, bật nguồn và kiểm tra rơ-le ngắt nhiệt, kiểm tra độ nhạy của chống giật ELCB.',
      },
    ],
    priceList: [
      { item: 'Vệ sinh, bảo dưỡng súc rửa bình nóng lạnh', unit: 'Bình', price: '150.000 - 200.000 đ' },
      { item: 'Thay thanh Magie chống ăn mòn chính hãng', unit: 'Thanh', price: '120.000 - 180.000 đ' },
      { item: 'Thay rơ-le nhiệt / thanh đốt bình nóng lạnh', unit: 'Bộ', price: '250.000 - 380.000 đ' },
      { item: 'Lắp đặt bình nóng lạnh mới (khoan treo, đấu nước, điện)', unit: 'Bộ', price: '200.000 - 300.000 đ' },
    ],
  },
]

export const REPAIR_SERVICES = INITIAL_SERVICES

const servicesCol = () => firestore.collection('services')

/**
 * Đảm bảo collection "services" đã có dữ liệu trên Cloud Firestore.
 * Nếu chưa có (collection trống), hệ thống tự động batch nạp toàn bộ danh sách dịch vụ lên Firestore.
 */
export async function seedServicesIfEmpty() {
  const snapshot = await servicesCol().get()
  if (snapshot.empty) {
    console.log('[services] Collection "services" trên Cloud Firestore đang trống. Đang tự động nạp dữ liệu mẫu...')
    const batch = firestore.batch()
    for (const item of INITIAL_SERVICES) {
      const docRef = servicesCol().doc(item.id)
      batch.set(docRef, {
        ...item,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    await batch.commit()
    console.log('[services] ✅ Đã nạp thành công các dịch vụ sửa chữa vào Cloud Firestore!')
    return INITIAL_SERVICES
  }

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/** Lấy danh sách dịch vụ sửa chữa từ Cloud Firestore */
export async function listRepairServices({ category, search } = {}) {
  let list = await seedServicesIfEmpty()

  // Sắp xếp theo thứ tự hiển thị ổn định
  const initialOrder = INITIAL_SERVICES.map((s) => s.id)
  list.sort((a, b) => {
    const idxA = initialOrder.indexOf(a.id)
    const idxB = initialOrder.indexOf(b.id)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    return (a.id || '').localeCompare(b.id || '')
  })

  if (category && category !== 'all') {
    list = list.filter((s) => s.category === category)
  }

  if (search) {
    const term = String(search).trim().toLowerCase()
    list = list.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(term) ||
        (s.shortDesc || '').toLowerCase().includes(term) ||
        (s.categoryName || '').toLowerCase().includes(term),
    )
  }

  return list
}

/** Lấy chi tiết 1 dịch vụ từ Cloud Firestore theo ID */
export async function getRepairService(id) {
  if (!id) throw badRequest('Thiếu mã dịch vụ.')

  const doc = await servicesCol().doc(id).get()
  if (doc.exists) {
    return { id: doc.id, ...doc.data() }
  }

  // Nếu chưa có, nạp dữ liệu khởi tạo rồi tìm lại
  const list = await seedServicesIfEmpty()
  const found = list.find((s) => s.id === id)
  if (!found) throw notFound('Không tìm thấy dịch vụ sửa chữa này.')
  return found
}

/** Thêm mới dịch vụ lên Cloud Firestore (Dành cho Admin) */
export async function createRepairService(input = {}) {
  const title = String(input.title || '').trim()
  if (!title) throw badRequest('Vui lòng nhập tiêu đề dịch vụ.')

  const id =
    String(input.id || '').trim() ||
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const docRef = servicesCol().doc(id)
  const existing = await docRef.get()
  if (existing.exists) {
    throw conflict('Dịch vụ với mã này đã tồn tại.')
  }

  const newService = {
    ...input,
    id,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await docRef.set(newService)
  return newService
}

/** Cập nhật dịch vụ trên Cloud Firestore (Dành cho Admin) */
export async function updateRepairService(id, input = {}) {
  if (!id) throw badRequest('Thiếu mã dịch vụ.')
  const docRef = servicesCol().doc(id)
  const existing = await docRef.get()
  if (!existing.exists) {
    throw notFound('Không tìm thấy dịch vụ để cập nhật.')
  }

  const updated = {
    ...existing.data(),
    ...input,
    id,
    updatedAt: Date.now(),
  }

  await docRef.set(updated)
  return updated
}

/** Xóa dịch vụ khỏi Cloud Firestore (Dành cho Admin) */
export async function deleteRepairService(id) {
  if (!id) throw badRequest('Thiếu mã dịch vụ.')
  const docRef = servicesCol().doc(id)
  const existing = await docRef.get()
  if (!existing.exists) {
    throw notFound('Không tìm thấy dịch vụ để xóa.')
  }

  await docRef.delete()
  return { success: true, id }
}
