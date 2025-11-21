import './BearBullBattle.css'

const BearBullBattle = () => {
  return (
    <div className="bear-bull-battle">
      {/* Bull (Left Side) */}
      <div className="bull-container">
        <svg className="bull" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* Bull Body */}
          <ellipse cx="100" cy="120" rx="50" ry="40" fill="#10b981" opacity="0.9"/>

          {/* Bull Head */}
          <circle cx="75" cy="90" r="30" fill="#059669"/>

          {/* Bull Horns */}
          <path d="M 60 70 Q 50 50, 45 60" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 90 70 Q 100 50, 105 60" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round"/>

          {/* Bull Eye */}
          <circle cx="70" cy="85" r="4" fill="white"/>
          <circle cx="70" cy="85" r="2" fill="#1f2937"/>

          {/* Bull Nose */}
          <ellipse cx="60" cy="95" rx="8" ry="6" fill="#047857"/>
          <circle cx="58" cy="94" r="2" fill="#1f2937"/>
          <circle cx="62" cy="94" r="2" fill="#1f2937"/>

          {/* Bull Legs */}
          <rect x="70" y="150" width="8" height="30" rx="4" fill="#059669"/>
          <rect x="90" y="150" width="8" height="30" rx="4" fill="#059669"/>
          <rect x="110" y="150" width="8" height="30" rx="4" fill="#059669"/>
          <rect x="130" y="150" width="8" height="30" rx="4" fill="#059669"/>

          {/* Bull Tail */}
          <path d="M 150 115 Q 165 110, 170 95" stroke="#059669" strokeWidth="5" fill="none" strokeLinecap="round"/>
        </svg>

        {/* Upward Arrow */}
        <div className="bull-arrow">
          <svg viewBox="0 0 50 80" xmlns="http://www.w3.org/2000/svg">
            <path d="M 25 10 L 25 70" stroke="#10b981" strokeWidth="4" strokeLinecap="round"/>
            <path d="M 15 20 L 25 10 L 35 20" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M 15 30 L 25 20 L 35 30" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
          </svg>
        </div>
      </div>

      {/* VS Text in Center */}
      <div className="vs-text">
        <div className="vs-circle">
          <span>VS</span>
        </div>
        <div className="battle-sparks">
          <div className="spark spark-1"></div>
          <div className="spark spark-2"></div>
          <div className="spark spark-3"></div>
          <div className="spark spark-4"></div>
        </div>
      </div>

      {/* Bear (Right Side) */}
      <div className="bear-container">
        <svg className="bear" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* Bear Body */}
          <ellipse cx="100" cy="120" rx="50" ry="40" fill="#ef4444" opacity="0.9"/>

          {/* Bear Head */}
          <circle cx="125" cy="90" r="30" fill="#dc2626"/>

          {/* Bear Ears */}
          <circle cx="110" cy="70" r="12" fill="#b91c1c"/>
          <circle cx="140" cy="70" r="12" fill="#b91c1c"/>

          {/* Bear Eye */}
          <circle cx="130" cy="85" r="4" fill="white"/>
          <circle cx="130" cy="85" r="2" fill="#1f2937"/>

          {/* Bear Snout */}
          <ellipse cx="140" cy="95" rx="8" ry="6" fill="#b91c1c"/>
          <circle cx="138" cy="94" r="2" fill="#1f2937"/>
          <circle cx="142" cy="94" r="2" fill="#1f2937"/>

          {/* Bear Legs */}
          <rect x="70" y="150" width="8" height="30" rx="4" fill="#dc2626"/>
          <rect x="90" y="150" width="8" height="30" rx="4" fill="#dc2626"/>
          <rect x="110" y="150" width="8" height="30" rx="4" fill="#dc2626"/>
          <rect x="130" y="150" width="8" height="30" rx="4" fill="#dc2626"/>

          {/* Bear Claws */}
          <path d="M 60 85 L 50 75 M 60 90 L 48 85 M 60 95 L 50 95" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round"/>
        </svg>

        {/* Downward Arrow */}
        <div className="bear-arrow">
          <svg viewBox="0 0 50 80" xmlns="http://www.w3.org/2000/svg">
            <path d="M 25 10 L 25 70" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
            <path d="M 15 60 L 25 70 L 35 60" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M 15 50 L 25 60 L 35 50" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default BearBullBattle
