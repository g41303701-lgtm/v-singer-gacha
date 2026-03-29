export const metadata = {
  title: "メンテナンス中 | 歌ウマVtuberガチャ",
  description: "不具合対応のため、サービスを一時停止しております。",
};

export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        padding: '40px',
        maxWidth: '500px',
        border: '1px solid #333',
        borderRadius: '24px',
        backgroundColor: '#111',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'fadeIn 1s ease-out'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛠️</div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #ff8a00, #e52e71)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          現在、不具合対応のため<br />サービスを一時停止しております
        </h1>
        <p style={{
          color: '#aaa',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          不具合の復旧の目途が立ち次第、再開させていただきます。<br />
          ご不便をおかけして申し訳ございませんが、今しばらくお待ちください。
        </p>
        <div style={{
          padding: '12px',
          backgroundColor: '#222',
          borderRadius: '12px',
          fontSize: '0.9rem',
          color: '#888'
        }}>
          歌ウマVtuberガチャ 開発チーム
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
