import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(name, email, password);
      navigate("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <div className="space-y-1">
              <label
                className="text-xs font-semibold text-blue-dust/80 tracking-wider uppercase"
                htmlFor="name"
              >
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
          )}

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-blue-dust/80 tracking-wider uppercase"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-prussian-blue-darker/60 border border-blue-dust/20 text-white placeholder:text-blue-dust/40 focus:outline-none focus:border-pistachio focus:ring-1 focus:ring-pistachio/40 transition-all font-sans text-sm"
              placeholder="e.g. adrian@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-blue-dust/80 tracking-wider uppercase"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-prussian-blue-darker/60 border border-blue-dust/20 text-white placeholder:text-blue-dust/40 focus:outline-none focus:border-pistachio focus:ring-1 focus:ring-pistachio/40 transition-all font-sans text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 text-center tracking-wide">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 bg-pistachio hover:bg-pistachio-light text-prussian-blue-darker font-semibold tracking-wider text-xs uppercase rounded-lg shadow-lg hover:shadow-pistachio/15 hover:translate-y-[-1px] active:translate-y-[0px] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-xs text-pistachio/80 hover:text-pistachio underline transition-colors"
          >
            {mode === "login"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-8 border-t border-blue-dust/10 pt-4 text-center">
          <p className="text-[10px] text-blue-dust/50 tracking-wider uppercase">
            Audio &bull; Video &bull; Board &bull; Files
          </p>
        </div>
      </div>
    </div>
  );
}
