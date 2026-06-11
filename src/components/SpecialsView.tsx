import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Award, Trophy, Star, ShieldCheck, Timer, Save, HelpCircle, Check, AlertCircle, RefreshCw } from "lucide-react";
import { COUNTRY_FLAGS, getTeamFlagUrl } from "../types";
import { getAllPlayers } from "../utils/playersData";
import { apiFetch } from "../utils/apiFetch";

interface SpecialsViewProps {
  userId: string;
  onRefresh: () => void;
}

interface SpecialsData {
  Campeon: string;
  Subcampeon: string;
  Goleador: string;
  MejorJugador: string;
  MejorArquero: string;
  Clasificados?: string;
  FechaEnvio: string;
}

interface ConfigData {
  ResultadoCampeon: string;
  ResultadoSubcampeon: string;
  ResultadoGoleador: string;
  ResultadoMejorJugador: string;
  ResultadoMejorArquero: string;
  GoogleSheetID: string;
}

const COUNTRIES = [
  "Argentina",
  "Brasil",
  "Francia",
  "Alemania",
  "España",
  "Portugal",
  "Inglaterra",
  "Italia",
  "Uruguay",
  "Países Bajos",
  "Bélgica",
  "México",
  "EE.UU.",
  "Canadá",
  "Marruecos",
  "Colombia",
  "Ecuador",
  "Senegal",
  "Japón",
  "Corea del Sur",
  "Croacia",
  "Suiza"
].sort();

const allGeneratedPlayers = getAllPlayers();

const ALL_GOLEADORES_SUGGESTIONS = allGeneratedPlayers
  .filter(p => !p.isArquero)
  .map(p => `${p.name} (${p.country})`)
  .sort((a, b) => a.localeCompare(b));

const ALL_JUGADORES_SUGGESTIONS = allGeneratedPlayers
  .filter(p => !p.isArquero)
  .map(p => `${p.name} (${p.country})`)
  .sort((a, b) => a.localeCompare(b));

const ALL_ARQUEROS_SUGGESTIONS = allGeneratedPlayers
  .filter(p => p.isArquero)
  .map(p => `${p.name} (${p.country})`)
  .sort((a, b) => a.localeCompare(b));


export default function SpecialsView({ userId, onRefresh }: SpecialsViewProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  
  const [specials, setSpecials] = useState<SpecialsData>({
    Campeon: "",
    Subcampeon: "",
    Goleador: "",
    MejorJugador: "",
    MejorArquero: "",
    FechaEnvio: "",
  });

  const [config, setConfig] = useState<ConfigData>({
    ResultadoCampeon: "",
    ResultadoSubcampeon: "",
    ResultadoGoleador: "",
    ResultadoMejorJugador: "",
    ResultadoMejorArquero: "",
    GoogleSheetID: "",
  });

  const [optionLists, setOptionLists] = useState<{
    teams: string[];
    goleadores: string[];
    mejorJugadores: string[];
    mejorArqueros: string[];
  }>({
    teams: [],
    goleadores: [],
    mejorJugadores: [],
    mejorArqueros: [],
  });

  const [goleadorOption, setGoleadorOption] = useState("");
  const [goleadorManual, setGoleadorManual] = useState("");
  const [mejorJugadorOption, setMejorJugadorOption] = useState("");
  const [mejorJugadorManual, setMejorJugadorManual] = useState("");
  const [mejorArqueroOption, setMejorArqueroOption] = useState("");
  const [mejorArqueroManual, setMejorArqueroManual] = useState("");

  const [activeSuggestionField, setActiveSuggestionField] = useState<"goleador" | "mejorJugador" | "mejorArquero" | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 32 qualified teams state variables
  const [activeSubTab, setActiveSubTab] = useState<"ternas" | "clasificados">("ternas");

  useEffect(() => {
    const savedSubTab = localStorage.getItem("specials-subtab");
    if (savedSubTab === "clasificados" || savedSubTab === "ternas") {
      setActiveSubTab(savedSubTab);
      // Clean up to prevent stale state on subsequent refreshes
      localStorage.removeItem("specials-subtab");
    }
  }, []);

  const [isClasificadosLocked, setIsClasificadosLocked] = useState(false);
  const [clasificadosLockReason, setClasificadosLockReason] = useState<string | null>(null);
  const [selectedClasificados, setSelectedClasificados] = useState<string[]>([]);
  const [qualifiedTeamsList, setQualifiedTeamsList] = useState<string[]>([]);
  const [clasificadosSearch, setClasificadosSearch] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [savingClasificados, setSavingClasificados] = useState(false);

  const renderSuggestions = (
    field: "goleador" | "mejorJugador" | "mejorArquero",
    query: string,
    suggestionsList: string[],
    onSelect: (val: string) => void
  ) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;

    const filtered = suggestionsList.filter((name) =>
      name.toLowerCase().includes(trimmed)
    ).slice(0, 5);

    if (filtered.length === 0) {
      return (
        <div className="px-3 py-2 text-[10px] text-slate-400 italic bg-white select-none">
          Sin coincidencia sugerida.
        </div>
      );
    }

    return (
      <div className="py-1 bg-white border border-slate-200.5 rounded-lg shadow-md max-h-48 overflow-y-auto w-full select-none">
        <div className="px-2.5 py-1 text-[9px] font-bold text-indigo-600 bg-indigo-50/40 uppercase tracking-wider">
          💡 Autocompletar (E spelling exacto)
        </div>
        {filtered.map((item) => (
          <button
            key={item}
            type="button"
            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold transition border-b border-rose-50/10 cursor-pointer"
            onMouseDown={() => {
              // use onMouseDown instead of onClick so it fires before onBlur takes away the component!
              onSelect(item);
              setActiveSuggestionField(null);
            }}
          >
            {item}
          </button>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchOptions();
      await fetchSpecials();
      setLoading(false);
    };
    init();
  }, [userId]);

  const fetchOptions = async () => {
    try {
      const response = await apiFetch("/api/specials/options");
      if (response.ok) {
        const data = await response.json();
        setOptionLists({
          teams: data.teams || [],
          goleadores: data.goleadores || [],
          mejorJugadores: data.mejorJugadores || [],
          mejorArqueros: data.mejorArqueros || [],
        });
      }
    } catch (err) {
      console.error("Error loading specials lists options:", err);
    }
  };

  const fetchSpecials = async () => {
    setStatusMessage(null);
    try {
      const response = await apiFetch("/api/specials", {
        headers: {
          "X-User-Id": userId,
        },
      });
      const data = await response.json();
      if (response.ok) {
        if (data.specials) {
          setSpecials(data.specials);
          if (data.specials.Clasificados) {
            setSelectedClasificados(data.specials.Clasificados.split(",").filter(Boolean));
          } else {
            setSelectedClasificados([]);
          }
        } else {
          setSelectedClasificados([]);
        }
        setIsLocked(data.isLocked);
        setLockReason(data.lockReason);
        setIsClasificadosLocked(data.isClasificadosLocked);
        setClasificadosLockReason(data.clasificadosLockReason);
        setQualifiedTeamsList(data.qualifiedTeamsList || []);
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (e) {
      console.error("Error fetching specials:", e);
    }
  };

  // Sync loaded/saved values into corresponding select dropdown values and manual input states
  useEffect(() => {
    if (specials.Goleador) {
      if (optionLists.goleadores.includes(specials.Goleador)) {
        setGoleadorOption(specials.Goleador);
        setGoleadorManual("");
      } else {
        setGoleadorOption("Otro");
        setGoleadorManual(specials.Goleador);
      }
    } else {
      setGoleadorOption("");
      setGoleadorManual("");
    }

    if (specials.MejorJugador) {
      if (optionLists.mejorJugadores.includes(specials.MejorJugador)) {
        setMejorJugadorOption(specials.MejorJugador);
        setMejorJugadorManual("");
      } else {
        setMejorJugadorOption("Otro");
        setMejorJugadorManual(specials.MejorJugador);
      }
    } else {
      setMejorJugadorOption("");
      setMejorJugadorManual("");
    }

    if (specials.MejorArquero) {
      if (optionLists.mejorArqueros.includes(specials.MejorArquero)) {
        setMejorArqueroOption(specials.MejorArquero);
        setMejorArqueroManual("");
      } else {
        setMejorArqueroOption("Otro");
        setMejorArqueroManual(specials.MejorArquero);
      }
    } else {
      setMejorArqueroOption("");
      setMejorArqueroManual("");
    }
  }, [specials.Goleador, specials.MejorJugador, specials.MejorArquero, optionLists]);

  const handleGoleadorOptionChange = (val: string) => {
    setGoleadorOption(val);
    if (val === "Otro") {
      handleFieldChange("Goleador", goleadorManual || "");
    } else {
      handleFieldChange("Goleador", val);
    }
  };

  const handleGoleadorManualChange = (val: string) => {
    setGoleadorManual(val);
    handleFieldChange("Goleador", val);
  };

  const handleMejorJugadorOptionChange = (val: string) => {
    setMejorJugadorOption(val);
    if (val === "Otro") {
      handleFieldChange("MejorJugador", mejorJugadorManual || "");
    } else {
      handleFieldChange("MejorJugador", val);
    }
  };

  const handleMejorJugadorManualChange = (val: string) => {
    setMejorJugadorManual(val);
    handleFieldChange("MejorJugador", val);
  };

  const handleMejorArqueroOptionChange = (val: string) => {
    setMejorArqueroOption(val);
    if (val === "Otro") {
      handleFieldChange("MejorArquero", mejorArqueroManual || "");
    } else {
      handleFieldChange("MejorArquero", val);
    }
  };

  const handleMejorArqueroManualChange = (val: string) => {
    setMejorArqueroManual(val);
    handleFieldChange("MejorArquero", val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    // Strict validation: if "Otro" is chosen, they MUST have selected a valid player from the suggestion lists
    if (goleadorOption === "Otro") {
      const trimmed = goleadorManual.trim();
      if (!trimmed) {
        setStatusMessage({ type: "error", text: "Error: Por favor escribe y selecciona el Goleador de la lista de sugerencias." });
        return;
      }
      if (!ALL_GOLEADORES_SUGGESTIONS.includes(trimmed)) {
        setStatusMessage({ type: "error", text: "Error: El Goleador ingresado no es válido. Debes seleccionarlo obligatoriamente de la lista de sugerencias desplegable." });
        return;
      }
    }

    if (mejorJugadorOption === "Otro") {
      const trimmed = mejorJugadorManual.trim();
      if (!trimmed) {
        setStatusMessage({ type: "error", text: "Error: Por favor escribe y selecciona el Mejor Jugador de la lista de sugerencias." });
        return;
      }
      if (!ALL_JUGADORES_SUGGESTIONS.includes(trimmed)) {
        setStatusMessage({ type: "error", text: "Error: El Mejor Jugador ingresado no es válido. Debes seleccionarlo obligatoriamente de la lista de sugerencias desplegable." });
        return;
      }
    }

    if (mejorArqueroOption === "Otro") {
      const trimmed = mejorArqueroManual.trim();
      if (!trimmed) {
        setStatusMessage({ type: "error", text: "Error: Por favor escribe y selecciona el Mejor Arquero de la lista de sugerencias." });
        return;
      }
      if (!ALL_ARQUEROS_SUGGESTIONS.includes(trimmed)) {
        setStatusMessage({ type: "error", text: "Error: El Mejor Arquero ingresado no es válido. Debes seleccionarlo obligatoriamente de la lista de sugerencias desplegable." });
        return;
      }
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const response = await apiFetch("/api/specials/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          campeon: specials.Campeon,
          subcampeon: specials.Subcampeon,
          goleador: specials.Goleador,
          mejorJugador: specials.MejorJugador,
          mejorArquero: specials.MejorArquero,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatusMessage({ type: "success", text: "¡Pronósticos especiales guardados con éxito!" });
        onRefresh(); // trigger general stats updates
        await fetchSpecials();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Ocurrió un error al guardar." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error de red. No se pudo conectar con el portal." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (key: keyof SpecialsData, val: string) => {
    setSpecials((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  // Helper matching loose comparison helper
  const checkIfCorrect = (userVal: string, officialVal: string) => {
    if (!userVal || !officialVal) return false;
    const u = userVal.trim().toLowerCase();
    const o = officialVal.trim().toLowerCase();
    if (u === o) return true;
    if (u.length > 3 && o.length > 3) {
      if (u.includes(o) || o.includes(u)) return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <RefreshCw className="h-8 w-8 animate-spin mb-3 text-indigo-600" />
        <span className="text-xs font-medium">Cargando ternas de pronósticos especiales...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            {activeSubTab === "ternas" ? "Ternas Especiales del Torneo" : "Clasificados a 16avos de Final"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeSubTab === "ternas" 
              ? "Elige tus candidatos definitivos antes que empiece el primer partido del Mundial para sumar puntos adicionales."
              : "Selecciona las 32 selecciones que clasificarán de la Fase de Grupos a la ronda eliminatoria. Sumas +2 puntos por acierto."
            }
          </p>
        </div>

        {activeSubTab === "ternas" ? (
          isLocked ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 text-rose-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0">
              <Timer className="h-4 w-4 animate-pulse text-rose-500" />
              <span>Ternas Cerradas • {lockReason || "El torneo ha iniciado"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Abierto • Carga de Ternas</span>
            </div>
          )
        ) : (
          isClasificadosLocked ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 text-rose-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0">
              <Timer className="h-4 w-4 animate-pulse text-rose-500" />
              <span>Clasificados Cerrados • {clasificadosLockReason || "Fecha límite expirada"}</span>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Abierto</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold">Límite: Miércoles 17 de Junio, 23:59 hs (Arg)</span>
            </div>
          )
        )}
      </div>

      {/* Sub-tab selection bar */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveSubTab("ternas")}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeSubTab === "ternas" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span>🏆 Ternas Especiales</span>
          {activeSubTab === "ternas" && (
            <motion.div layoutId="specialSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("clasificados")}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeSubTab === "clasificados" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className="flex items-center gap-1.5">
            ⚽ Clasificados 16avos ({selectedClasificados.length}/32)
          </span>
          {activeSubTab === "clasificados" && (
            <motion.div layoutId="specialSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border text-xs font-medium transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200/80 text-emerald-800"
              : "bg-rose-50 border-rose-200/80 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {activeSubTab === "ternas" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Item 1: Champions Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    +15 Ptos
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Campeón del Mundo</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  La gran selección que levantará la Copa del Mundo en Estados Unidos, Canadá y México.
                </p>
              </div>

              <div className="mt-4">
                {isLocked ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Tu apuesta:</span>
                      <span className="text-indigo-700">{specials.Campeon || "— Sin seleccionar —"}</span>
                    </div>
                    {config.ResultadoCampeon && (
                      <div
                        className={`rounded-lg p-2 text-xs font-bold flex justify-between ${
                          checkIfCorrect(specials.Campeon, config.ResultadoCampeon)
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}
                      >
                        <span>Resultado oficial:</span>
                        <span>
                          {config.ResultadoCampeon}{" "}
                          {checkIfCorrect(specials.Campeon, config.ResultadoCampeon) ? "✅ (+15)" : "❌ (0)"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    value={specials.Campeon}
                    onChange={(e) => handleFieldChange("Campeon", e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border-slate-300 shadow-xs focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 py-2 px-2.5"
                  >
                    <option value="">-- Seleccionar Selección --</option>
                    {optionLists.teams.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Trophy className="h-32 w-32 text-indigo-900" />
              </div>
            </div>

            {/* Item 2: Runner-up Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                    <Award className="h-5 w-5" />
                  </span>
                  <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    +10 Ptos
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Subcampeón Mundial</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  La selección que alcanzará la final y se quedará con el segundo puesto del torneo.
                </p>
              </div>

              <div className="mt-4">
                {isLocked ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Tu apuesta:</span>
                      <span className="text-amber-700">{specials.Subcampeon || "— Sin seleccionar —"}</span>
                    </div>
                    {config.ResultadoSubcampeon && (
                      <div
                        className={`rounded-lg p-2 text-xs font-bold flex justify-between ${
                          checkIfCorrect(specials.Subcampeon, config.ResultadoSubcampeon)
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}
                      >
                        <span>Resultado oficial:</span>
                        <span>
                          {config.ResultadoSubcampeon}{" "}
                          {checkIfCorrect(specials.Subcampeon, config.ResultadoSubcampeon) ? "✅ (+10)" : "❌ (0)"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    value={specials.Subcampeon}
                    onChange={(e) => handleFieldChange("Subcampeon", e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border-slate-300 shadow-xs focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 py-2 px-2.5"
                  >
                    <option value="">-- Seleccionar Selección --</option>
                    {optionLists.teams.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Award className="h-32 w-32 text-amber-900" />
              </div>
            </div>

            {/* Item 3: Golden Boot (Goleador) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 relative flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Star className="h-5 w-5" />
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    +10 Ptos
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Goleador del Mundial</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  El máximo artillero del certamen mundialista (Goleador absoluto de la cita).
                </p>
              </div>

              <div className="mt-4">
                {isLocked ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Tu apuesta:</span>
                      <span className="text-emerald-700">{specials.Goleador || "— Sin seleccionar —"}</span>
                    </div>
                    {config.ResultadoGoleador && (
                      <div
                        className={`rounded-lg p-2 text-xs font-bold flex justify-between ${
                          checkIfCorrect(specials.Goleador, config.ResultadoGoleador)
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}
                      >
                        <span>Resultado oficial:</span>
                        <span>
                          {config.ResultadoGoleador}{" "}
                          {checkIfCorrect(specials.Goleador, config.ResultadoGoleador) ? "✅ (+10)" : "❌ (0)"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={goleadorOption}
                      onChange={(e) => handleGoleadorOptionChange(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border-slate-300 shadow-xs focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 py-2 px-2.5 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Goleador --</option>
                      {optionLists.goleadores.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                      <option value="Otro">Otro candidato (Escribir mano)...</option>
                    </select>
                    {goleadorOption === "Otro" && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escribí el nombre del goleador..."
                          value={goleadorManual}
                          onChange={(e) => handleGoleadorManualChange(e.target.value)}
                          onFocus={() => setActiveSuggestionField("goleador")}
                          onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                          className="w-full text-xs font-medium rounded-lg border border-slate-300 shadow-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white py-1.5 px-2.5 mt-1 focus:outline-none"
                        />
                        {activeSuggestionField === "goleador" && goleadorManual.trim().length > 0 && (
                          <div className="absolute left-0 right-0 z-[9999] mt-1 shadow-lg">
                            {renderSuggestions("goleador", goleadorManual, ALL_GOLEADORES_SUGGESTIONS, handleGoleadorManualChange)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Star className="h-32 w-32 text-emerald-950" />
              </div>
            </div>

            {/* Item 4: Golden Ball (Mejor Jugador) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 relative flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                    <Star className="h-5 w-5" />
                  </span>
                  <span className="bg-purple-100 text-purple-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    +10 Ptos
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Mejor Jugador del Torneo</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  El acreedor del Balón de Oro oficial elegido por la FIFA al final de la copa.
                </p>
              </div>

              <div className="mt-4">
                {isLocked ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Tu apuesta:</span>
                      <span className="text-purple-750">{specials.MejorJugador || "— Sin seleccionar —"}</span>
                    </div>
                    {config.ResultadoMejorJugador && (
                      <div
                        className={`rounded-lg p-2 text-xs font-bold flex justify-between ${
                          checkIfCorrect(specials.MejorJugador, config.ResultadoMejorJugador)
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}
                      >
                        <span>Resultado oficial:</span>
                        <span>
                          {config.ResultadoMejorJugador}{" "}
                          {checkIfCorrect(specials.MejorJugador, config.ResultadoMejorJugador) ? "✅ (+10)" : "❌ (0)"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={mejorJugadorOption}
                      onChange={(e) => handleMejorJugadorOptionChange(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border-slate-300 shadow-xs focus:ring-purple-500 focus:border-purple-500 bg-slate-50 py-2 px-2.5 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Jugador --</option>
                      {optionLists.mejorJugadores.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                      <option value="Otro">Otro candidato (Escribir mano)...</option>
                    </select>
                    {mejorJugadorOption === "Otro" && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escribí el nombre del jugador..."
                          value={mejorJugadorManual}
                          onChange={(e) => handleMejorJugadorManualChange(e.target.value)}
                          onFocus={() => setActiveSuggestionField("mejorJugador")}
                          onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                          className="w-full text-xs font-medium rounded-lg border border-slate-300 shadow-xs focus:ring-purple-500 focus:border-purple-500 bg-white py-1.5 px-2.5 mt-1 focus:outline-none"
                        />
                        {activeSuggestionField === "mejorJugador" && mejorJugadorManual.trim().length > 0 && (
                          <div className="absolute left-0 right-0 z-[9999] mt-1 shadow-lg">
                            {renderSuggestions("mejorJugador", mejorJugadorManual, ALL_JUGADORES_SUGGESTIONS, handleMejorJugadorManualChange)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Star className="h-32 w-32 text-purple-950" />
              </div>
            </div>

            {/* Item 5: Golden Glove (Mejor Arquero) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 relative flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                    <Award className="h-5 w-5" />
                  </span>
                  <span className="bg-teal-100 text-teal-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    +10 Ptos
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Mejor Arquero (Guante de Oro)</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  El arquero oficial con mejor desempeño y valla del certamen deportivo.
                </p>
              </div>

              <div className="mt-4">
                {isLocked ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs font-bold text-slate-700 flex justify-between">
                      <span>Tu apuesta:</span>
                      <span className="text-teal-755">{specials.MejorArquero || "— Sin seleccionar —"}</span>
                    </div>
                    {config.ResultadoMejorArquero && (
                      <div
                        className={`rounded-lg p-2 text-xs font-bold flex justify-between ${
                          checkIfCorrect(specials.MejorArquero, config.ResultadoMejorArquero)
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800"
                        }`}
                      >
                        <span>Resultado oficial:</span>
                        <span>
                          {config.ResultadoMejorArquero}{" "}
                          {checkIfCorrect(specials.MejorArquero, config.ResultadoMejorArquero) ? "✅ (+10)" : "❌ (0)"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={mejorArqueroOption}
                      onChange={(e) => handleMejorArqueroOptionChange(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border-slate-300 shadow-xs focus:ring-teal-500 focus:border-teal-500 bg-slate-50 py-2 px-2.5 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Arquero --</option>
                      {optionLists.mejorArqueros.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                      <option value="Otro">Otro candidato (Escribir mano)...</option>
                    </select>
                    {mejorArqueroOption === "Otro" && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escribí el nombre del arquero..."
                          value={mejorArqueroManual}
                          onChange={(e) => handleMejorArqueroManualChange(e.target.value)}
                          onFocus={() => setActiveSuggestionField("mejorArquero")}
                          onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                          className="w-full text-xs font-medium rounded-lg border border-slate-300 shadow-xs focus:ring-teal-500 focus:border-teal-500 bg-white py-1.5 px-2.5 mt-1 focus:outline-none"
                        />
                        {activeSuggestionField === "mejorArquero" && mejorArqueroManual.trim().length > 0 && (
                          <div className="absolute left-0 right-0 z-[9999] mt-1 shadow-lg">
                            {renderSuggestions("mejorArquero", mejorArqueroManual, ALL_ARQUEROS_SUGGESTIONS, handleMejorArqueroManualChange)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Award className="h-32 w-32 text-teal-950" />
              </div>
            </div>
          </div>

          {/* Submit Actions Button */}
          {!isLocked && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-white font-extrabold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl border border-indigo-700/30 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer select-none"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Procesando Guardado...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Predicciones Especiales</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      ) : (
        /* Render 32 Clasificados layout */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>🗂️ Selección de 32 Selecciones</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">(48 participantes en total)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hacé click sobre cada selección para elegir exactamente los 32 equipos que avanzarán de fase.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status indicators */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    selectedClasificados.length === 32
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {selectedClasificados.length === 32
                    ? "¡Listo! 32/32 seleccionados"
                    : `${selectedClasificados.length}/32 seleccionados`}
                </span>

                {!isClasificadosLocked && selectedClasificados.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedClasificados([])}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Limpiar lista
                  </button>
                )}
              </div>
            </div>

            {/* Filters/Search area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Buscar selección por nombre..."
                  value={clasificadosSearch}
                  onChange={(e) => setClasificadosSearch(e.target.value)}
                  className="w-full text-xs font-medium pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlySelected}
                  onChange={(e) => setShowOnlySelected(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span>Mostrar sólo mis elegidos</span>
              </label>
            </div>

            {/* Grid of Teams */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {Object.keys(COUNTRY_FLAGS)
                .sort((a, b) => a.localeCompare(b))
                .filter((teamName) => {
                  // Apply search filter
                  if (clasificadosSearch.trim() !== "" && !teamName.toLowerCase().includes(clasificadosSearch.trim().toLowerCase())) {
                    return false;
                  }
                  // Apply selected filter
                  if (showOnlySelected && !selectedClasificados.includes(teamName)) {
                    return false;
                  }
                  return true;
                })
                .map((teamName) => {
                  const isSelected = selectedClasificados.includes(teamName);
                  const flagUrl = getTeamFlagUrl(teamName);
                  const hasQualifiedOfficially = qualifiedTeamsList.map(t => t.toLowerCase()).includes(teamName.toLowerCase());
                  const isGroupStageFinished = qualifiedTeamsList.length === 32;

                  let renderBadge = null;
                  if (hasQualifiedOfficially) {
                    if (isSelected) {
                      renderBadge = (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-300 shadow-sm z-10 flex items-center gap-0.5 animate-pulse">
                          <span>✅</span> <span>+2 Pts</span>
                        </span>
                      );
                    } else {
                      renderBadge = (
                        <span className="absolute top-1.5 right-1.5 bg-amber-50 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-200/60 z-10">
                          Clasificó
                        </span>
                      );
                    }
                  } else {
                    // Only show "0 Pts" if the group stage is fully completed and all 32 qualified teams are known
                    if (isGroupStageFinished && isSelected) {
                      renderBadge = (
                        <span className="absolute top-1.5 right-1.5 bg-rose-100 text-rose-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-rose-200 z-10 flex items-center gap-0.5">
                          <span>❌</span> <span>0 Pts</span>
                        </span>
                      );
                    }
                  }

                  return (
                    <button
                      key={teamName}
                      type="button"
                      disabled={isClasificadosLocked}
                      onClick={() => {
                        if (isClasificadosLocked) return;
                        if (isSelected) {
                          setSelectedClasificados((prev) => prev.filter((t) => t !== teamName));
                        } else {
                          if (selectedClasificados.length >= 32) {
                            alert("Has alcanzado el límite de 32 selecciones. Desmarca alguna antes de agregar una nueva.");
                            return;
                          }
                          setSelectedClasificados((prev) => [...prev, teamName]);
                        }
                      }}
                      className={`relative p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all select-none overflow-hidden ${
                        isClasificadosLocked ? "cursor-default" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "bg-indigo-50/40 border-indigo-200 font-extrabold text-indigo-700 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      } ${
                        hasQualifiedOfficially
                          ? "ring-2 ring-emerald-500/30"
                          : ""
                      }`}
                    >
                      {renderBadge}

                      <div className="w-11 h-7 rounded-md border border-slate-100 overflow-hidden shadow-xs shrink-0 flex items-center justify-center bg-slate-50">
                        {flagUrl ? (
                          <img
                            src={flagUrl}
                            alt={teamName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">🏁</span>
                        )}
                      </div>

                      <span className="mt-2 text-xs font-semibold leading-tight line-clamp-1 truncate w-full">
                        {teamName}
                      </span>

                      {isSelected && (
                        <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white font-extrabold text-[8px] flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Empty Search Result feedback */}
            {Object.keys(COUNTRY_FLAGS).filter((teamName) => {
              if (clasificadosSearch.trim() !== "" && !teamName.toLowerCase().includes(clasificadosSearch.trim().toLowerCase())) return false;
              if (showOnlySelected && !selectedClasificados.includes(teamName)) return false;
              return true;
            }).length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No se encontraron selecciones con los filtros aplicados.</p>
              </div>
            )}

            {/* Actions bar */}
            {!isClasificadosLocked && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-150 pt-5 mt-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedClasificados.length === 32 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></span>
                  <span className="text-xs font-bold text-slate-700">
                    {selectedClasificados.length === 32 ? (
                      <span className="text-emerald-700 font-extrabold">✓ ¡Lista completa! Ya podés guardar tu predicción.</span>
                    ) : (
                      <span className="text-amber-800">
                        Faltan seleccionar {32 - selectedClasificados.length} país{32 - selectedClasificados.length === 1 ? '' : 'es'} para poder guardar.
                      </span>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedClasificados.length !== 32 || savingClasificados}
                  onClick={async () => {
                    if (selectedClasificados.length !== 32) return;
                    setSavingClasificados(true);
                    setStatusMessage(null);
                    try {
                      const response = await apiFetch("/api/specials/submit-clasificados", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "X-User-Id": userId,
                        },
                        body: JSON.stringify({
                          clasificados: selectedClasificados,
                        }),
                      });
                      const rdata = await response.json();
                      if (response.ok) {
                        setStatusMessage({
                          type: "success",
                          text: "¡Tus 32 elecciones clasificadas han sido guardadas y registradas con éxito!",
                        });
                        onRefresh();
                        await fetchSpecials();
                      } else {
                        setStatusMessage({
                          type: "error",
                          text: rdata.error || "Ocurrió un error al registrar las clasificaciones.",
                        });
                      }
                    } catch (e) {
                      setStatusMessage({
                        type: "error",
                        text: "Error de red al intentar comunicarse con el servidor central.",
                      });
                    } finally {
                      setSavingClasificados(false);
                    }
                  }}
                  className={`w-full sm:w-auto font-extrabold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl border transition-all flex items-center justify-center gap-2 select-none ${
                    selectedClasificados.length === 32 && !savingClasificados
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700/30 shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                  }`}
                >
                  {savingClasificados ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Lista de 32 Clasificados</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
