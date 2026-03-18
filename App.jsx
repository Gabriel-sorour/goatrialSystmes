import { useState, useEffect } from 'react'

function App() {
  const [liveWeight, setLiveWeight] = useState(0)
  const [tareWeight, setTareWeight] = useState(0)
  const [grossWeight, setGrossWeight] = useState(0)
  const [formData, setFormData] = useState({
    carNumber: '',
    driverName: '',
    cargoType: '',
    customer: '',
    notes: ''
  })

  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (window.scaleApi) {
      window.scaleApi.onWeightReceive((newWeight) => {
        setLiveWeight(Number(newWeight))
      })
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const netWeight = Math.abs(grossWeight - tareWeight)

  // --- الدالة المحدثة: حفظ + طباعة + مسح البيانات ---
  const handlePrint = async () => {
    if (!formData.carNumber) {
      alert('يرجى إدخال رقم السيارة أولاً')
      return
    }

    const isConfirmed = window.confirm(
      `تأكيد عملية الميزان:\nرقم السيارة: ${formData.carNumber}\nالصافي: ${netWeight} KG\n\nهل أنت متأكد؟`
    )

    if (!isConfirmed) return

    const ticketData = {
      ...formData,
      tareWeight,
      grossWeight,
      netWeight
    }

    if (window.scaleApi) {
      try {
        // 1. الحفظ والطباعة
        await window.scaleApi.saveTransaction(ticketData)
        window.scaleApi.printTicket(ticketData)

        // 2. تحديث السجل في الخلفية
        const updatedHistory = await window.scaleApi.getHistory()
        setHistory(updatedHistory)

        // 3. --- التعديل المطلوب: مسح كل الخانات والأوزان ---
        setFormData({
          carNumber: '',
          driverName: '',
          cargoType: '',
          customer: '',
          notes: ''
        })
        setTareWeight(0)
        setGrossWeight(0)

        console.log('تمت العملية بنجاح وتم تصفير الخانات')
      } catch (err) {
        alert('حدث خطأ أثناء الحفظ')
      }
    }
  }

  const fetchHistory = async () => {
    if (window.scaleApi) {
      const data = await window.scaleApi.getHistory()
      setHistory(data)
      setShowHistory(true)
    }
  }

  const handleRePrint = (oldData) => {
    if (window.scaleApi) {
      window.scaleApi.printTicket(oldData)
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: '30px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#eef2f3',
        minHeight: '100vh'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}
      >
        <h1 style={{ color: '#2c3e50', margin: 0 }}>نظام ميزان جوتريال للبسكول 🚛</h1>
        <button
          onClick={fetchHistory}
          style={{ ...btnStyle, backgroundColor: '#34495e', fontSize: '14px' }}
        >
          📁 سجل العمليات
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div
          style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        >
          <h3
            style={{
              borderBottom: '2px solid #3498db',
              paddingBottom: '10px',
              color: '#3498db',
              marginBottom: '20px'
            }}
          >
            بيانات العملية
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={labelStyle}>رقم السيارة</label>
              <input
                name="carNumber"
                value={formData.carNumber}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="مثال: ١٢٣ أ ب ج"
              />
            </div>
            <div>
              <label style={labelStyle}>اسم السائق</label>
              <input
                name="driverName"
                value={formData.driverName}
                onChange={handleInputChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>العميل / المورد</label>
              <input
                name="customer"
                value={formData.customer}
                onChange={handleInputChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>نوع البضاعة</label>
              <input
                name="cargoType"
                value={formData.cargoType}
                onChange={handleInputChange}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>ملاحظات إضافية</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              style={{ ...inputStyle, height: '80px', resize: 'none' }}
            ></textarea>
          </div>
        </div>

        <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#111',
              color: '#00ff00',
              padding: '25px',
              borderRadius: '15px',
              textAlign: 'center',
              border: '5px solid #333'
            }}
          >
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '10px' }}>
              الوزن الحي الآن (LIVE)
            </div>
            <div style={{ fontSize: '90px', fontWeight: 'bold' }}>
              {liveWeight} <span style={{ fontSize: '30px' }}>KG</span>
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#fff',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            <div style={weightRowStyle}>
              <button
                onClick={() => setTareWeight(liveWeight)}
                style={{ ...btnStyle, backgroundColor: '#f39c12' }}
              >
                تسجيل وزن فارغ (Tare)
              </button>
              <div style={weightValueStyle}>{tareWeight} KG</div>
            </div>
            <div style={weightRowStyle}>
              <button
                onClick={() => setGrossWeight(liveWeight)}
                style={{ ...btnStyle, backgroundColor: '#e74c3c' }}
              >
                تسجيل وزن قائم (Gross)
              </button>
              <div style={weightValueStyle}>{grossWeight} KG</div>
            </div>
            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />
            <div style={weightRowStyle}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#27ae60' }}>
                الوزن الصافي (Net):
              </div>
              <div style={{ fontSize: '35px', fontWeight: 'bold', color: '#27ae60' }}>
                {netWeight} KG
              </div>
            </div>
            <button
              onClick={handlePrint}
              style={{
                ...btnStyle,
                backgroundColor: '#2ecc71',
                width: '100%',
                marginTop: '25px',
                fontSize: '22px',
                height: '65px'
              }}
            >
              حفظ وطباعة التذكرة 📄
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                alignItems: 'center'
              }}
            >
              <h2 style={{ margin: 0, color: '#2c3e50' }}>📋 سجل العمليات</h2>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  border: 'none',
                  background: '#e74c3c',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  padding: '8px 20px'
                }}
              >
                إغلاق
              </button>
            </div>
            <div
              style={{
                maxHeight: '450px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'right',
                  backgroundColor: '#fff'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#185897', color: '#ffffff' }}>
                    <th style={thStyle}>التاريخ والوقت</th>
                    <th style={thStyle}>رقم السيارة</th>
                    <th style={thStyle}>الصافي</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{new Date(row.createdAt).toLocaleString('ar-EG')}</td>
                      <td style={tdStyle}>{row.carNumber}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: '#27ae60' }}>
                        {row.netWeight} KG
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleRePrint(row)}
                          style={{
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          🖨️ إعادة طباعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 'bold',
  color: '#444',
  fontSize: '14px'
}
const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  boxSizing: 'border-box',
  fontSize: '16px',
  outline: 'none',
  backgroundColor: '#fafafa'
}
const btnStyle = {
  padding: '12px 25px',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '16px',
  transition: 'all 0.3s ease'
}
const weightRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px'
}
const weightValueStyle = { fontSize: '28px', fontWeight: 'bold', color: '#444' }
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
}
const modalStyle = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '15px',
  width: '90%',
  maxWidth: '1000px'
}
const thStyle = { padding: '15px', textAlign: 'right', color: 'white' }
const tdStyle = { padding: '15px', color: '#333' }

export default App
