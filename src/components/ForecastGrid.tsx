import React, { useState, useEffect } from "react";
import { HelpCircle, Check, AlertTriangle, ShieldCheck, ChevronRight, CornerDownRight, Timer, ClipboardList } from "lucide-react";
import { MatchDetailItem, formatArgentinaDate, formatArgentinaDateOnly, formatArgentinaWeekdayDate, getMatchRoundLabel, getTeamFlagUrl } from "../types";
import { apiFetch } from "../utils/apiFetch";

interface ForecastGridProps {
  userId: string;
  activeRound: string;
  matches: MatchDetailItem[];
  isLocked: boolean;
  lockReason: string | null;
  lockDate: string | undefined;
  onSubmitSuccess: () => void;
  setActiveTab?: (tab: string) => void;
}

export default function ForecastGrid({
  userId,
  activeRound,
  matches,
  isLocked,
  lockReason,
  lockDate,
  onSubmitSuccess,
  setActiveTab,
}: ForecastGridProps) {
  // Local state for forecasting edits
  // Map of matchId -> { golesA: number | "", golesB: number | "" }
  const [inputs, setInputs] = useState<Record<string, { golesA: number | ""; golesB: number | "" }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmingStage, setIsConfirmingStage] = useState(false); // revision summary step
  const [searchQuery, setSearchQuery] = useState("");

  // Reset inputs when matches change
  useEffect(() => {
    const initialInputs: Record<string, { golesA: number | ""; golesB: number | "" }> = {};
    matches.forEach((m) => {
      if (m.userForecast) {
        initialInputs[m.matchId] = {
          golesA: m.userForecast.golesA,
          golesB: m.userForecast.golesB,
        };
      } else {
        initialInputs[m.matchId] = { golesA: "", golesB: "" };
      }
    });
    setInputs(initialInputs);
    setIsConfirmingStage(false);
    setErrorMessage(null);
  }, [matches]);

  // Check if user has already submitted some predictions (if at least one forecast is already stored)
  const usersPredictionsAlreadySubmitted = matches.some((m) => m.userForecast !== null);

  // If we are in "Fase de Grupos", predictions are forbidden purely by design rules:
  const isGroupsPhase = activeRound === "Fase de Grupos";

  const handleInputChange = (matchId: string, team: "A" | "B", value: string) => {
    const numericValue = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
    setInputs((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === "A" ? "golesA" : "golesB"]: numericValue,
      },
    }));
  };

  const handleIncrement = (matchId: string, team: "A" | "B") => {
    const currentVal = inputs[matchId]?.[team === "A" ? "golesA" : "golesB"];
    const numericValue = currentVal === "" ? 0 : currentVal;
    handleInputChange(matchId, team, (numericValue + 1).toString());
  };

  const handleDecrement = (matchId: string, team: "A" | "B") => {
    const currentVal = inputs[matchId]?.[team === "A" ? "golesA" : "golesB"];
    const numericValue = currentVal === "" ? 0 : currentVal;
    if (numericValue > 0) {
      handleInputChange(matchId, team, (numericValue - 1).toString());
    }
  };

  // Triggered when clicking "Revisar Pronósticos"
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate if all fields are filled
    const unfilledMatches = matches.filter((m) => {
      const inp = inputs[m.matchId];
      return !inp || inp.golesA === "" || inp.golesB === "";
    });

    if (unfilledMatches.length > 0) {
      setErrorMessage(
        `Por favor, completa el marcador para todos los partidos de la ronda (${unfilledMatches.length} restantes).`
      );
      return;
    }

    setIsConfirmingStage(true);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Triggered when submitting the actual remote POST to the API
  const handleSubmitForecasts = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    // Prepare payload
    const submissionArray = matches.map((m) => ({
      matchId: m.matchId,
      golesA: inputs[m.matchId].golesA as number,
      golesB: inputs[m.matchId].golesB as number,
    }));

    try {
      const response = await apiFetch("/api/predictions/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({ predictions: submissionArray }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Error al enviar pronósticos");
      }

      setIsConfirmingStage(false);
      onSubmitSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron registrar tus pronósticos.");
    } finally {
      setSubmitting(false);
    }
  };

  // Multipliers display helpers
  const getMultiplierLabel = (r: string) => {
    if (r.includes("16avos")) return "x1";
    if (r.includes("Octavos")) return "x1.5";
    if (r.includes("Cuartos")) return "x2";
    if (r.includes("Semifinales")) return "x3";
    if (r.includes("Tercer Puesto")) return "x3";
    if (r.includes("Final")) return "x5";
    return "x1";
  };

  const getPointsBadgeClass = (category: string | null) => {
    switch (category) {
      case "exacto":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "diferencia":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "ganador":
      case "empate":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const translateCategory = (category: string | null) => {
    switch (category) {
      case "exacto":
        return "Resultado Exacto (+5 pts)";
      case "diferencia":
        return "Dif. Goles Correcta (+4 pts)";
      case "ganador":
        return "Ganador Correcto (+3 pts)";
      case "empate":
        return "Empate Correcto (+3 pts)";
      case "error":
        return "Sin aciertos (0 pts)";
      default:
        return "Por jugarse / procesar";
    }
  };

  // Filter matches based on the search query
  const filteredMatches = matches.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.equipoA.toLowerCase().includes(q) ||
      m.equipoB.toLowerCase().includes(q) ||
      m.ronda.toLowerCase().includes(q) ||
      m.estadio.toLowerCase().includes(q)
    );
  });

  // Sort and group matches by calendar date only
  const sortedFilteredMatches = [...filteredMatches].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
  );

  const dateGroupsMap: Record<string, MatchDetailItem[]> = {};
  const orderedDates: string[] = [];

  sortedFilteredMatches.forEach((m) => {
    const dateKey = m.fechaHora ? formatArgentinaDateOnly(m.fechaHora) : "Sin Fecha";
    if (!dateGroupsMap[dateKey]) {
      dateGroupsMap[dateKey] = [];
      orderedDates.push(dateKey);
    }
    dateGroupsMap[dateKey].push(m);
  });

  return (
    <div id="forecast-grid-root" className="space-y-6">
      {/* Dynamic Status Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div id="forecast-header-card" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-150">
                Ronda: {activeRound}
              </span>
              {isLocked || usersPredictionsAlreadySubmitted ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Modo Lectura
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  PRONOSTICÁ TUS RESULTADOS
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
              {isConfirmingStage ? "Revisar tus Pronósticos" : "Registrar Pronósticos Deportivos"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isGroupsPhase
                ? "¡Ya podés cargar tus pronósticos individuales de partidos para la Fase de Grupos! Además, recordá elegir a las 32 selecciones clasificadas."
                : "Completa tus pronósticos para asegurar tu participación en el podio. Recuerda que una vez enviados, no hay posibilidad de modificación."}
            </p>
            <div id="timezone-notice" className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/60 border border-indigo-100 rounded-lg px-2.5 py-1.5 w-fit font-medium">
              <span>🇦🇷</span>
              <span>Todos los horarios de los partidos se muestran automáticamente ajustados a la <strong>Hora Oficial de Argentina (UTC-3)</strong>.</span>
            </div>
          </div>

          {!isLocked && !usersPredictionsAlreadySubmitted && (
            <div className="flex items-center space-x-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 shrink-0">
              <Timer className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-[10px] uppercase tracking-wider text-amber-800">Cierre de Pronósticos</p>
                <p className="text-amber-950 font-bold mt-0.5">
                  {lockDate ? formatArgentinaDate(lockDate) : "Al comenzar primer partido"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Global state notification */}
        <div className="mt-6">
          {isLocked ? (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-orange-900 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-orange-850">Ronda Bloqueada Permanentemente</h4>
                <p className="text-xs mt-1 text-orange-700">
                  {lockReason || "Se ha iniciado un partido de esta ronda o expiró el límite fijado."} No se admiten nuevos pronósticos.
                </p>
              </div>
            </div>
          ) : usersPredictionsAlreadySubmitted && !isConfirmingStage ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-start space-x-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-850">Pronósticos Enviados y Asegurados</h4>
                <p className="text-xs mt-1 text-emerald-700">
                  Tus marcadores están bloqueados. Se comparan automáticamente con los resultados reales de los partidos de la FIFA para actualizar el ranking. ¡Muchos éxitos en la competencia!
                </p>
              </div>
            </div>
          ) : isGroupsPhase ? (
            <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/40 via-white to-white p-5 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xs animate-fade-in">
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block">
                    PRONÓSTICOS ESPECIALES DISPONIBLES
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                  🏆 Sumá puntos con los Pronósticos Especiales
                </h4>
                <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                  Recordá que tenés tiempo para <strong>armar tu lista de los 32 países clasificados (+2 pts de bonus c/u)</strong> y elegir las <strong>5 ternas definitivas del torneo</strong> (Campeón, Goleador, Mejor Jugador, etc.) para sumar grandes ventajas en la competencia general.
                </p>
                <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50/70 inline-block px-2.5 py-1 rounded-lg border border-indigo-100">
                  ⏳ Cierre absoluto: Miércoles 17 de Junio de 2026, 23:59 hs (Arg)
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("specials-subtab", "clasificados");
                    if (setActiveTab) setActiveTab("specials");
                  }}
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>⚽ Elegir 32 Clasificados</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("specials-subtab", "ternas");
                    if (setActiveTab) setActiveTab("specials");
                  }}
                  className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center space-x-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-violet-500/10 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>🏆 Completar 5 Ternas</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm font-semibold flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-650" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CONFIRMATION SUMMARY STEP */}
      {isConfirmingStage ? (
        <div id="forecast-confirming-panel" className="space-y-6">
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <ClipboardList className="text-emerald-600" />
              Resumen de Pronósticos a Enviar
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((m) => {
                const draft = inputs[m.matchId];
                return (
                  <div key={m.matchId} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider block">{getMatchRoundLabel(m.ronda, m.fechaHora)} <span className="text-slate-400 font-semibold">• {m.estadio}</span></span>
                      <p className="font-bold text-sm text-slate-700 flex items-center gap-1.5 mt-1">
                        <span>{m.equipoA}</span>
                        <span className="text-slate-400 font-normal">vs</span>
                        <span>{m.equipoB}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="font-black text-slate-800 text-base w-6 text-center">{draft?.golesA}</span>
                      <span className="text-slate-300 font-medium">-</span>
                      <span className="font-black text-slate-800 text-base w-6 text-center">{draft?.golesB}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 mt-6 text-amber-900 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold text-sm text-amber-900">Confirmación Obligatoria</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Revisa detalladamente cada marcador. Al presionar "Confirmar y Bloquear", tus marcadores serán registrados oficialmente con ID, fecha y hora y nunca podrán volver a corregirse ni cambiarse.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end space-x-4">
              <button
                id="btn-forecast-go-back"
                type="button"
                onClick={() => setIsConfirmingStage(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Volver a corregir
              </button>

              <button
                id="btn-forecast-confirm-locked"
                type="button"
                disabled={submitting}
                onClick={handleSubmitForecasts}
                className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-250 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-55"
              >
                {submitting ? "Procesando..." : "Confirmar y Bloquear"}
                <Check className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD EDITING & VIEWING GRID SCREEN */
        <form id="forecast-editing-form" onSubmit={handleProceedToConfirmation} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Matches list col span 12 to allow generous 4 columns layout */}
            <div className="lg:col-span-12 space-y-6">
              {/* Search Bar & Stats Header */}
              <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:max-w-md relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar selección, estadio, ronda..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-8 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 focus:bg-white shadow-3xs transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  Resultados: <span className="text-indigo-600 font-extrabold">{filteredMatches.length}</span> de {matches.length} partidos
                </div>
              </div>

              {/* Date Grouped Fixture list */}
              {orderedDates.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6">
                  <p className="text-sm font-semibold text-slate-500">No se encontraron partidos que coincidan con la búsqueda.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {orderedDates.map((dateKey) => {
                    const dateMatches = dateGroupsMap[dateKey];
                    return (
                      <div key={dateKey} className="space-y-4">
                        {/* Horizontal date divider separator */}
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-extrabold uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-xl tracking-wider shrink-0 shadow-3xs">
                            📅 {dateKey}
                          </span>
                          <div className="h-0.5 bg-slate-200 flex-1 rounded"></div>
                        </div>

                        {/* 4-column cards grid on PC */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {dateMatches.map((m) => {
                            const scoreDraft = inputs[m.matchId] || { golesA: "", golesB: "" };
                            const isReadOnly = isLocked || usersPredictionsAlreadySubmitted;

                            return (
                              <div
                                key={m.matchId}
                                className={`relative rounded-xl border p-4 bg-white shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between ${
                                  usersPredictionsAlreadySubmitted
                                    ? "border-slate-100 bg-slate-50/20"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {/* Card Header metadata */}
                                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-3 border-b border-slate-50 pb-2 font-bold uppercase tracking-wider">
                                  <span className="truncate max-w-[70%]" title={m.estadio}>
                                    🏟️ {m.estadio}
                                  </span>
                                  <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.25 rounded text-[8px] font-black">
                                    {getMultiplierLabel(m.ronda)}
                                  </span>
                                </div>

                                {/* SYMMETRICAL SPLIT GOAL SECTIONS (one on each side) */}
                                <div className="space-y-2">
                                  {/* Team A on top split */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {getTeamFlagUrl(m.equipoA) ? (
                                        <img
                                          src={getTeamFlagUrl(m.equipoA)!}
                                          alt={m.equipoA}
                                          className="h-5 w-8 object-cover rounded shadow-3xs border border-slate-200 shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <span className="h-5 w-8 bg-slate-100 rounded text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                                          {m.equipoA.substring(0, 3).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-extrabold text-slate-700 truncate" title={m.equipoA}>
                                        {m.equipoA}
                                      </span>
                                    </div>

                                    {/* Input Goal A */}
                                    <div className="shrink-0">
                                      {isReadOnly ? (
                                        <span className="inline-block w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-center leading-8 font-black text-xs text-slate-800">
                                          {m.userForecast ? m.userForecast.golesA : "-"}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={scoreDraft.golesA}
                                          onChange={(e) => handleInputChange(m.matchId, "A", e.target.value)}
                                          placeholder="0"
                                          className="w-10 h-8 bg-slate-50 text-center rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-none font-black text-xs text-slate-800 transition-all select-all focus:ring-1 focus:ring-emerald-500"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* VS text in the center */}
                                  <div className="flex items-center justify-center">
                                    <span className="text-[8px] font-black text-slate-350 tracking-widest">VS</span>
                                  </div>

                                  {/* Team B on bottom split */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {getTeamFlagUrl(m.equipoB) ? (
                                        <img
                                          src={getTeamFlagUrl(m.equipoB)!}
                                          alt={m.equipoB}
                                          className="h-5 w-8 object-cover rounded shadow-3xs border border-slate-200 shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <span className="h-5 w-8 bg-slate-100 rounded text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                                          {m.equipoB.substring(0, 3).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="text-[11px] font-extrabold text-slate-700 truncate" title={m.equipoB}>
                                        {m.equipoB}
                                      </span>
                                    </div>

                                    {/* Input Goal B */}
                                    <div className="shrink-0">
                                      {isReadOnly ? (
                                        <span className="inline-block w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-center leading-8 font-black text-xs text-slate-800">
                                          {m.userForecast ? m.userForecast.golesB : "-"}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={scoreDraft.golesB}
                                          onChange={(e) => handleInputChange(m.matchId, "B", e.target.value)}
                                          placeholder="0"
                                          className="w-10 h-8 bg-slate-50 text-center rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-none font-black text-xs text-slate-800 transition-all select-all focus:ring-1 focus:ring-emerald-500"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* FIFA official result & point feedback if processed */}
                                {m.realResult && m.realResult.golesA !== null && m.realResult.golesB !== null && (
                                  <div className="mt-3 border-t border-slate-100 pt-2 flex flex-col items-center gap-1 bg-slate-50/50 rounded-lg p-1.5">
                                    <span className="text-[8px] font-bold uppercase text-slate-400">Oficial FIFA</span>
                                    <span className="text-[10px] font-black text-slate-700">
                                      {m.realResult.golesA} - {m.realResult.golesB}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.25 text-[8px] font-extrabold border ${getPointsBadgeClass(m.pointCategory)}`}>
                                      {translateCategory(m.pointCategory)}
                                    </span>
                                  </div>
                                )}

                                {/* Card Footer kick-off time */}
                                <div className="text-[8px] text-slate-400 text-center mt-3 pt-2 border-t border-slate-50/50">
                                  ⚽ {formatArgentinaWeekdayDate(m.fechaHora)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>



          {/* Bottom Action buttons */}
          {isLocked || usersPredictionsAlreadySubmitted ? (
            <div className="rounded-xl border border-dashed border-emerald-250 bg-emerald-50/20 p-6 text-emerald-800 text-center text-xs font-bold">
              Las predicciones en este nivel ya han cerrado para tu cuenta o esta ronda ya se encuentra bloqueada.
            </div>
          ) : (
            <div className="pt-6 flex justify-end">
              <button
                id="btn-trigger-review-modal"
                type="submit"
                className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-750 active:scale-95 transition cursor-pointer"
              >
                <span>Revisar Pronósticos</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
