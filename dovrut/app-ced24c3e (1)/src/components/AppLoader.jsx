import { useEffect, useState } from 'react';

export default function AppLoader() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        opacity: phase === 2 ? 0 : 1,
        transition: phase === 2 ? 'opacity 0.5s ease-out' : 'none',
        background: 'radial-gradient(120% 120% at 50% 20%, #a78bfa 0%, #7c3aed 38%, #1e1b4b 72%, #0c0a14 100%)',
      }}
    >
      <div style={{
        position: 'absolute', top: -80, right: -60,
        width: 420, height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,184,207,0.28) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'loaderPulse 3s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -40,
        width: 480, height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,146,60,0.22) 0%, transparent 70%)',
        filter: 'blur(50px)',
        animation: 'loaderPulse 3s ease-in-out infinite 1s',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28,
        direction: 'rtl',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 28,
          padding: '44px 56px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(139,92,246,0.25)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 22,
          transform: phase === 0 ? 'translateY(16px) scale(0.97)' : 'translateY(0) scale(1)',
          opacity: phase === 0 ? 0 : 1,
          transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s ease',
        }}>
          <LogoMark />
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              fontFamily: 'Heebo, Arial, sans-serif',
            }}>
              מערכת דוברות
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.72)',
              marginTop: 6,
              fontWeight: 500,
              fontFamily: 'Heebo, Arial, sans-serif',
            }}>
              ניהול תוכן ומדיה
            </div>
          </div>
          <ProgressBar phase={phase} />
        </div>
      </div>

      <style>{`
        @keyframes loaderPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes loaderSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes loaderFill {
          0% { width: 0%; }
          30% { width: 40%; }
          70% { width: 75%; }
          100% { width: 95%; }
        }
        @keyframes loaderShimmer {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function LogoMark() {
  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: '2px solid transparent',
        borderTopColor: '#22b8cf',
        borderRightColor: '#a78bfa',
        animation: 'loaderSpin 1.8s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 8,
        borderRadius: '50%',
        border: '1.5px solid transparent',
        borderBottomColor: '#fb923c',
        borderLeftColor: '#c4b5fd',
        animation: 'loaderSpin 1.2s linear infinite reverse',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6, #22b8cf)',
        boxShadow: '0 0 16px rgba(139,92,246,0.7)',
        animation: 'loaderShimmer 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

function ProgressBar({ phase }) {
  return (
    <div style={{
      width: 180,
      height: 3,
      borderRadius: 99,
      background: 'rgba(255,255,255,0.18)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        borderRadius: 99,
        background: 'linear-gradient(90deg, #22b8cf, #a78bfa, #fb923c)',
        animation: phase >= 1 ? 'loaderFill 2.3s cubic-bezier(0.4,0,0.2,1) forwards' : 'none',
        boxShadow: '0 0 8px rgba(167,139,250,0.6)',
      }} />
    </div>
  );
}
