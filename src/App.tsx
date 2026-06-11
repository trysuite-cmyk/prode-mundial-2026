import React, { useState, useEffect } from "react";
import { Lock, Mail, User, Trophy, AlertCircle, Sparkles, LogIn, ChevronRight, UserPlus, RefreshCw } from "lucide-react";
import { UserSession, MatchDetailItem, LeaderboardRow, UserProfileData } from "./types";
import { apiFetch } from "./utils/apiFetch";
import HeaderNav from "./components/HeaderNav";
import ForecastGrid from "./components/ForecastGrid";
import RankingView from "./components/RankingView";
import HistoryView from "./components/HistoryView";
import AdminPanel from "./components/AdminPanel";
import SpecialsView from "./components/SpecialsView";
import RulesFAQView from "./components/RulesFAQView";

export default function App() {
  // Session \& Router state
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>("forecast"); // forecast, ranking, profile, admin
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [apellidoInput, setApellidoInput] = useState("");

  // Fetched App Data
  const [activeRound, setActiveRound] = useState("Fase de Grupos");
  const [matches, setMatches] = useState<MatchDetailItem[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [lockDate, setLockDate] = useState<string | undefined>(undefined);

  const [ranking, setRanking] = useState<LeaderboardRow[]>([]);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  // Status Loaders
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Alert Logs
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if session exists in localStorage on startup & listen to auth unauthorized custom event
  useEffect(() => {
    // 1. Restore local session
    const saved = localStorage.getItem("prode_fifa_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserSession;
        setSession(parsed);
        // Default to forecast tab
        setActiveTab("forecast");
      } catch (e) {
        localStorage.removeItem("prode_fifa_session");
      }
    }

    // 2. Clear invalid session if custom event "auth-unauthorized" is received (triggered by apiFetch)
    const handleUnauthorized = () => {
      console.warn("[Security] Session invalidated by server. Forcing immediate logout.");
      localStorage.removeItem("prode_fifa_session");
      setSession(null);
      setAuthError("Tu cuenta ha sido eliminada o desactivada por el administrador.");
      setActiveTab("forecast");
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, []);

  // Periodic heartbeat session check + visibility regaining immediate verification
  useEffect(() => {
    if (!session) return;

    const verifySession = async () => {
      try {
        const response = await apiFetch("/api/auth/session-check", {
          headers: {
            "X-User-Id": session.user.id,
          },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            localStorage.removeItem("prode_fifa_session");
            setSession(null);
            setAuthError("Tu cuenta ha sido eliminada o desactivada por el administrador.");
            setActiveTab("forecast");
          }
        }
      } catch (err) {
        // Silently handle transient connection drops or server restarts gracefully without flooding loud error consoles
        console.debug("Silent heartbeat check postponed due to transient network status:", err);
      }
    };

    // Verify immediately on session initiation/mount
    verifySession();

    // Verify periodically every 8 seconds
    const interval = setInterval(verifySession, 8000);

    // Verify immediately when client regains window focus/visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifySession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  // Fetch App Data whenever session or activeTab changes
  useEffect(() => {
    if (!session) return;

    if (activeTab === "forecast" || activeTab === "admin") {
      fetchMatches();
    }
    if (activeTab === "ranking") {
      fetchRanking();
    }
    if (activeTab === "profile") {
      fetchProfile();
    }
  }, [session, activeTab]);

  // Telemetry Fetch Actions
  const fetchMatches = async () => {
    if (!session) return;
    setLoadingMatches(true);
    try {
      const response = await apiFetch("/api/matches", {
        headers: {
          "X-User-Id": session.user.id,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setActiveRound(data.activeRound);
        setMatches(data.matches);
        setIsLocked(data.isLocked);
        setLockReason(data.lockReason);
        setLockDate(data.lockDate);
      }
    } catch (e) {
      console.error("Error fetching matches:", e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchRanking = async () => {
    setLoadingRanking(true);
    try {
      const headers: Record<string, string> = {};
      if (session) {
        headers["X-User-Id"] = session.user.id;
      }
      const response = await apiFetch("/api/ranking", { headers });
      const data = await response.json();
      if (response.ok) {
        setRanking(data.ranking);
      }
    } catch (e) {
      console.error("Error fetching ranking:", e);
    } finally {
      setLoadingRanking(false);
    }
  };

  const fetchProfile = async () => {
    if (!session) return;
    setLoadingProfile(true);
    try {
      const response = await apiFetch(`/api/profile/${session.user.id}`, {
        headers: {
          "X-User-Id": session.user.id,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Error de servidor (${response.status}): ${text.substring(0, 100) || response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Credenciales inválidas.");
      }

      // Save Session
      localStorage.setItem("prode_fifa_session", JSON.stringify(data));
      setSession(data);
      setActiveTab("forecast");
      fetchMatches();
    } catch (err: any) {
      setAuthError(err.message || "No se ha podido iniciar sesión.");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreInput,
          apellido: apellidoInput,
          email: emailInput,
          password: passwordInput,
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Error de servidor (${response.status}): ${text.substring(0, 100) || response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar la cuenta.");
      }

      // Immediate auto-login on successful registration
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      let loginData;
      const loginContentType = loginResponse.headers.get("content-type");
      if (loginContentType && loginContentType.includes("application/json")) {
        loginData = await loginResponse.json();
      } else {
        const text = await loginResponse.text();
        throw new Error(`Error de auto-login (${loginResponse.status}): ${text.substring(0, 100) || loginResponse.statusText}`);
      }

      if (!loginResponse.ok) {
        throw new Error(loginData.error || "Error al iniciar sesión tras registrarse.");
      }

      localStorage.setItem("prode_fifa_session", JSON.stringify(loginData));
      setSession(loginData);
      setActiveTab("forecast");
      fetchMatches();
    } catch (err: any) {
      setAuthError(err.message || "Error al completar el registro.");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("prode_fifa_session");
    setSession(null);
    setEmailInput("");
    setPasswordInput("");
    setNombreInput("");
    setApellidoInput("");
    setAuthError(null);
  };

  // Quick Autocomplete click trackers for demo easing
  const handleQuickLogin = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
    setIsRegistering(false);
    setAuthError(null);
  };

  // Safe calculated user ranking details
  const myRankingRow = ranking.find((r) => r.UsuarioID === session?.user.id);
  const userPoints = myRankingRow ? myRankingRow.Puntos : profile?.puntos || 0;
  const userPos = myRankingRow ? myRankingRow.Posicion : profile?.posicion || 999;

  const isAdmin = session?.user.email === "admin@prode2026.com";

  // RENDER LOGIN SCREEN (IF UNAUTHORIZED)
  if (!session) {
    return (
      <div id="auth-canvas" className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          {/* Brand Emblem */}
          <div className="text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-black border border-slate-900 shadow-xl overflow-hidden mb-3">
              <img
                src="/src/assets/images/world_cup_2026_logo_1781015208298.png"
                className="h-full w-full object-contain"
                alt="FIFA World Cup 2026"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 font-display">
              PRODE <span className="text-indigo-600 font-black">Mundial</span> FIFA 2026
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-medium">
              Portal interno de pronósticos deportivos para colaboradores
            </p>
          </div>

          {/* Form wrapper */}
          <div className="mt-8 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 text-center">
              {isRegistering ? "Registro de Colaborador" : "Control de Acceso"}
            </h3>

            {authError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-xs font-semibold flex items-center space-x-2 mb-5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={isRegistering ? handleRegister : handleLogin}>
              {isRegistering && (
                <div id="auth-register-namefields" className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="auth-reg-nombre"
                        type="text"
                        required
                        value={nombreInput}
                        onChange={(e) => setNombreInput(e.target.value)}
                        placeholder="Lionel"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Apellido</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="auth-reg-apellido"
                        type="text"
                        required
                        value={apellidoInput}
                        onChange={(e) => setApellidoInput(e.target.value)}
                        placeholder="Messi"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-ident-email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="messi@prode2026.com"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-ident-password"
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loadingAuth}
                className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-55"
              >
                {loadingAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin ml-1" />
                    <span>Procesando...</span>
                  </>
                ) : isRegistering ? (
                  <>
                    <span>Confirmar Registro</span>
                    <UserPlus className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <LogIn className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError(null);
                }}
                className="text-slate-500 hover:text-emerald-700 underline font-medium transition"
              >
                {isRegistering ? "¿Ya tienes cuenta? Ingresa aquí" : "¿Eres nuevo colaborador? Registrate"}
              </button>
            </div>
          </div>


        </div>

        {/* Humild trademark */}
        <div className="mt-8 text-center text-[10px] text-slate-450">
          PRODE de Colaboradores de uso recreativo interno • Copa Mundial FIFA 2026™
        </div>
      </div>
    );
  }

  // RENDER APP SCREEN (IF SESSIONS EXISTS)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="w-full flex-grow">
        {/* UPPER STEER HEADER */}
        <HeaderNav
          session={session}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === "ranking") fetchRanking();
            if (tab === "forecast") fetchMatches();
            if (tab === "profile") fetchProfile();
          }}
          userPoints={userPoints}
          userPos={userPos}
          onLogout={handleLogout}
          isAdmin={isAdmin}
        />

        {/* CONTAINER SHEATH SCREEN VIEW */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {/* Welcome & Stats Bento Header Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl shadow-slate-200/50 relative overflow-hidden border border-slate-950/20">
            <div className="relative z-10 space-y-2 max-w-xl">
              <span className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-amber-400/20 tracking-wider inline-block">
                🏆 COPA MUNDIAL FIFA 2026
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                ¡Hola, {session.user.nombre}! 👋
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm">
                Ronda actual: <strong className="text-amber-400 font-extrabold">{activeRound}</strong>. {isLocked ? "Los pronósticos para esta ronda están cerrados." : "Los partidos están listos. ¡Prepara tus pronósticos!"}
              </p>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6 relative z-10 mt-6 md:mt-0 w-full md:w-auto">
              {/* Premium 2026 logo framed delicately next to statistics */}
              <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/60 border border-slate-850 p-1.5 shadow-inner">
                <img
                  src="/src/assets/images/world_cup_2026_logo_1781015208298.png"
                  className="h-full w-full object-contain rounded-lg"
                  alt="Official FIFA LOGO"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Statistics Panel */}
              <div className="flex flex-row gap-4 sm:gap-6 bg-slate-950/60 p-4 sm:px-5 sm:py-4 rounded-xl border border-slate-800/80 backdrop-blur-sm w-full sm:w-auto justify-around shadow-inner">
                <div className="text-center min-w-[64px]">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Puntos</p>
                  <p className="text-2xl font-extrabold text-white">{userPoints}</p>
                </div>
                <div className="h-6 w-px bg-slate-800 self-center"></div>
                <div className="text-center min-w-[64px]">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Posición</p>
                  <p className="text-2xl font-extrabold text-amber-400">
                    #{userPos !== 999 ? userPos : "-"}
                  </p>
                </div>
                <div className="h-6 w-px bg-slate-800 self-center"></div>
                <div className="text-center min-w-[64px]">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Exactos</p>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {profile?.aciertosExactos ?? (myRankingRow?.AciertosExactos ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle bento fluid background pattern shapes for premium glass-morphism feel */}
            <div className="absolute right-0 top-0 w-72 h-72 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full -mr-20 -mt-20 opacity-35 blur-2xl pointer-events-none"></div>
            <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-emerald-500/10 rounded-full -ml-8 -mb-16 opacity-15 blur-xl pointer-events-none"></div>
          </div>

          {activeTab === "forecast" && (
            <div className={`transition-all duration-300 ${loadingMatches ? "opacity-60" : "opacity-100"}`}>
              {loadingMatches && matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-xs">Sincronizando fixture deportivo...</span>
                </div>
              ) : (
                <ForecastGrid
                  userId={session.user.id}
                  activeRound={activeRound}
                  matches={matches}
                  isLocked={isLocked}
                  lockReason={lockReason}
                  lockDate={lockDate}
                  onSubmitSuccess={() => {
                    fetchMatches();
                    fetchProfile();
                    fetchRanking();
                  }}
                  setActiveTab={setActiveTab}
                />
              )}
            </div>
          )}

          {activeTab === "ranking" && (
            <div className={`transition-all duration-300 ${loadingRanking ? "opacity-60" : "opacity-100"}`}>
              {loadingRanking && ranking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-xs">Actualizando posiciones en tiempo real...</span>
                </div>
              ) : (
                <RankingView ranking={ranking} currentUserId={session.user.id} />
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className={`transition-all duration-300 ${loadingProfile ? "opacity-60" : "opacity-100"}`}>
              <HistoryView profile={profile} onRefresh={fetchProfile} loading={loadingProfile} />
            </div>
          )}

          {activeTab === "specials" && (
            <div className="transition-all duration-300">
              <SpecialsView
                userId={session.user.id}
                onRefresh={() => {
                  fetchProfile();
                  fetchRanking();
                }}
              />
            </div>
          )}

          {activeTab === "faq" && (
            <div className="transition-all duration-300">
              <RulesFAQView />
            </div>
          )}

          {activeTab === "admin" && isAdmin && (
            <div className="transition-all duration-300">
              <AdminPanel
                activeRound={activeRound}
                matches={matches}
                isLocked={isLocked}
                lockDate={lockDate}
                onRefresh={() => {
                  fetchMatches();
                  fetchRanking();
                  fetchProfile();
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* COMPACT CLEAN FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-450 mt-12 bg-pattern">
        <p className="font-semibold text-slate-500">Powered by danisnakepit</p>
      </footer>
    </div>
  );
}
