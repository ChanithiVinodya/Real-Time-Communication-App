import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!name || !roomCode) return;
    localStorage.setItem('displayName', name);
    navigate(`/room/${roomCode.trim().toLowerCase()}`);
  }

  function generateRoom() {
    const prefixes = ['creative', 'studio', 'canvas', 'harmony', 'space', 'salon'];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    setRoomCode(`${randomPrefix}-${randomNum}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blurs to play with bean and blue-dust colors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bean/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-dust/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10 antialiased">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-pistachio/30 bg-prussian-blue-dark/50 text-pistachio mb-4 text-xl font-serif">
            S
          </div>
          <h1 className="font-serif text-3xl font-normal text-pistachio tracking-wide mb-2">
            Symphony
          </h1>
          <p className="text-xs text-blue-dust tracking-wider uppercase font-medium">
            Real-Time Collaboration
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-blue-dust/80 tracking-wider uppercase" htmlFor="name">
              Your Name
            </label>
            <input
              id="name"
              className="w-full px-4 py-3 rounded-lg bg-prussian-blue-darker/60 border border-blue-dust/20 text-white placeholder:text-blue-dust/40 focus:outline-none focus:border-pistachio focus:ring-1 focus:ring-pistachio/40 transition-all font-sans text-sm"
              placeholder="e.g. Adrian"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-blue-dust/80 tracking-wider uppercase" htmlFor="roomCode">
                Room Code
              </label>
              <button
                type="button"
                onClick={generateRoom}
                className="text-xs text-pistachio/80 hover:text-pistachio underline transition-colors"
              >
                Generate Code
              </button>
            </div>
            <input
              id="roomCode"
              className="w-full px-4 py-3 rounded-lg bg-prussian-blue-darker/60 border border-blue-dust/20 text-white placeholder:text-blue-dust/40 focus:outline-none focus:border-pistachio focus:ring-1 focus:ring-pistachio/40 transition-all font-sans text-sm"
              placeholder="e.g. creative-9923"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 bg-pistachio hover:bg-pistachio-light text-prussian-blue-darker font-semibold tracking-wider text-xs uppercase rounded-lg shadow-lg hover:shadow-pistachio/15 hover:translate-y-[-1px] active:translate-y-[0px] active:scale-[0.99] transition-all duration-200"
          >
            Enter Room
          </button>
        </form>

        <div className="mt-8 border-t border-blue-dust/10 pt-4 text-center">
          <p className="text-[10px] text-blue-dust/50 tracking-wider uppercase">
            Audio &bull; Video &bull; Board &bull; Files
          </p>
        </div>
      </div>
    </div>
  );
}

