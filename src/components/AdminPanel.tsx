import React, { useState, useEffect } from "react";
import { Settings, Save, AlertCircle, Eye, Copy, RefreshCw, Sparkles, Database, FileCode, Check, Users, Trash2, Key, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { MatchDetailItem } from "../types";
import { apiFetch } from "../utils/apiFetch";

interface AdminPanelProps {
  activeRound: string;
  matches: MatchDetailItem[];
  isLocked: boolean;
  lockDate: string | undefined;
  onRefresh: () => void;
}

export default function AdminPanel({
  activeRound,
  matches,
  isLocked,
  lockDate,
  onRefresh,
}: AdminPanelProps) {
  // Config States
  const [rondaSelect, setRondaSelect] = useState(activeRound);
  const [lockDateInput, setLockDateInput] = useState(lockDate ? lockDate.slice(0, 16) : "");
  const [estadoSistema, setEstadoSistema] = useState("Activo");
  const [appsScriptUrl, setAppsScriptUrl] = useState("");

  // Specials official outcomes states
  const [resultadoCampeon, setResultadoCampeon] = useState("");
  const [resultadoSubcampeon, setResultadoSubcampeon] = useState("");
  const [resultadoGoleador, setResultadoGoleador] = useState("");
  const [resultadoMejorJugador, setResultadoMejorJugador] = useState("");
  const [resultadoMejorArquero, setResultadoMejorArquero] = useState("");
  
  // Results inputs: map of matchId -> { golesA: number | "", golesB: number | "", estado: string }
  const [matchResults, setMatchResults] = useState<Record<string, { golesA: number | ""; golesB: number | ""; estado: string }>>({});

  // Code visualizer state
  const [appsScriptCode, setAppsScriptCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Status logs
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [syncingAI, setSyncingAI] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Registered users list structure (to view & delete them)
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [deletingUserMap, setDeletingUserMap] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Football API Sync Settings States
  const [footballProvider, setFootballProvider] = useState("football-data");
  const [footballApiKey, setFootballApiKey] = useState("a727a7bca89e4f62a7c5472e1292b2e6");
  const [footballLeagueId, setFootballLeagueId] = useState("WC");
  const [footballSeason, setFootballSeason] = useState("2026");
  const [footballTargetRound, setFootballTargetRound] = useState("Fase de Grupos");
  const [footballAutoDetect, setFootballAutoDetect] = useState(true);
  const [footballSyncScoresOnly, setFootballSyncScoresOnly] = useState(false);
  const [syncingFootballApi, setSyncingFootballApi] = useState(false);
  const [apiSyncSummary, setApiSyncSummary] = useState<any | null>(null);

  // Dynamic dropdown rosters lists
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

  useEffect(() => {
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
        console.error("Error loading specials lists options inside admin:", err);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (resultadoGoleador) {
      if (optionLists.goleadores.includes(resultadoGoleador)) {
        setGoleadorOption(resultadoGoleador);
        setGoleadorManual("");
      } else {
        setGoleadorOption("Otro");
        setGoleadorManual(resultadoGoleador);
      }
    } else {
      setGoleadorOption("");
      setGoleadorManual("");
    }

    if (resultadoMejorJugador) {
      if (optionLists.mejorJugadores.includes(resultadoMejorJugador)) {
        setMejorJugadorOption(resultadoMejorJugador);
        setMejorJugadorManual("");
      } else {
        setMejorJugadorOption("Otro");
        setMejorJugadorManual(resultadoMejorJugador);
      }
    } else {
      setMejorJugadorOption("");
      setMejorJugadorManual("");
    }

    if (resultadoMejorArquero) {
      if (optionLists.mejorArqueros.includes(resultadoMejorArquero)) {
        setMejorArqueroOption(resultadoMejorArquero);
        setMejorArqueroManual("");
      } else {
        setMejorArqueroOption("Otro");
        setMejorArqueroManual(resultadoMejorArquero);
      }
    } else {
      setMejorArqueroOption("");
      setMejorArqueroManual("");
    }
  }, [resultadoGoleador, resultadoMejorJugador, resultadoMejorArquero, optionLists]);

  const handleGoleadorOptionChange = (val: string) => {
    setGoleadorOption(val);
    if (val === "Otro") {
      setResultadoGoleador(goleadorManual || "");
    } else {
      setResultadoGoleador(val);
    }
  };

  const handleGoleadorManualChange = (val: string) => {
    setGoleadorManual(val);
    setResultadoGoleador(val);
  };

  const handleMejorJugadorOptionChange = (val: string) => {
    setMejorJugadorOption(val);
    if (val === "Otro") {
      setResultadoMejorJugador(mejorJugadorManual || "");
    } else {
      setResultadoMejorJugador(val);
    }
  };

  const handleMejorJugadorManualChange = (val: string) => {
    setMejorJugadorManual(val);
    setResultadoMejorJugador(val);
  };

  const handleMejorArqueroOptionChange = (val: string) => {
    setMejorArqueroOption(val);
    if (val === "Otro") {
      setResultadoMejorArquero(mejorArqueroManual || "");
    } else {
      setResultadoMejorArquero(val);
    }
  };

  const handleMejorArqueroManualChange = (val: string) => {
    setMejorArqueroManual(val);
    setResultadoMejorArquero(val);
  };

  // Load properties
  useEffect(() => {
    setRondaSelect(activeRound);
    if (lockDate) {
      setLockDateInput(lockDate.slice(0, 16));
    }
  }, [activeRound, lockDate]);

  useEffect(() => {
    // Prepopulate match score inputs with actual scores if available
    const initialScores: Record<string, { golesA: number | ""; golesB: number | ""; estado: string }> = {};
    matches.forEach((m) => {
      initialScores[m.matchId] = {
        golesA: m.realResult?.golesA !== null && m.realResult?.golesA !== undefined ? m.realResult.golesA : "",
        golesB: m.realResult?.golesB !== null && m.realResult?.golesB !== undefined ? m.realResult.golesB : "",
        estado: m.estado || "Pendiente",
      };
    });
    setMatchResults(initialScores);
  }, [matches]);

  // Load initial Sheets variables \& copyable apps script code
  const fetchDatabaseState = async () => {
    try {
      const r = await apiFetch("/api/admin/sheet-structure");
      const d = await r.json();
      setRegisteredUsers(d.sheets?.USUARIOS || []);
      const confs = d.sheets?.CONFIG || [];
      const urlConf = confs.find((c: any) => c.Variable === "GoogleAppsScriptUrl")?.Valor || "";
      const systemConf = confs.find((c: any) => c.Variable === "EstadoSistema")?.Valor || "Activo";
      setAppsScriptUrl(urlConf);
      setEstadoSistema(systemConf);

      // Load football api configuration if saved in Database
      const savedProvider = confs.find((c: any) => c.Variable === "FootballApiProvider")?.ValorValue || confs.find((c: any) => c.Variable === "FootballApiProvider")?.Valor;
      if (savedProvider) setFootballProvider(savedProvider);
      
      const savedApiKey = confs.find((c: any) => c.Variable === "FootballApiKey")?.Valor;
      setFootballApiKey(savedApiKey || "a727a7bca89e4f62a7c5472e1292b2e6");

      const savedLeague = confs.find((c: any) => c.Variable === "FootballLeagueID")?.Valor;
      if (savedLeague) setFootballLeagueId(savedLeague);

      const savedSeason = confs.find((c: any) => c.Variable === "FootballSeason")?.Valor;
      if (savedSeason) setFootballSeason(savedSeason);

      setResultadoCampeon(confs.find((c: any) => c.Variable === "ResultadoCampeon")?.Valor || "");
      setResultadoSubcampeon(confs.find((c: any) => c.Variable === "ResultadoSubcampeon")?.Valor || "");
      setResultadoGoleador(confs.find((c: any) => c.Variable === "ResultadoGoleador")?.Valor || "");
      setResultadoMejorJugador(confs.find((c: any) => c.Variable === "ResultadoMejorJugador")?.Valor || "");
      setResultadoMejorArquero(confs.find((c: any) => c.Variable === "ResultadoMejorArquero")?.Valor || "");
    } catch (err) {
      console.error("Error loading database structure:", err);
    }
  };

  useEffect(() => {
    apiFetch("/api/admin/apps-script-code")
      .then((r) => r.json())
      .then((d) => setAppsScriptCode(d.code || ""))
      .catch((err) => console.error(err));

    fetchDatabaseState();
  }, []);

  const handleScoreChange = (matchId: string, team: "A" | "B", val: string) => {
    const value = val === "" ? "" : Math.max(0, parseInt(val, 10) || 0);
    setMatchResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === "A" ? "golesA" : "golesB"]: value,
      },
    }));
  };

  const handleStatusChange = (matchId: string, status: string) => {
    setMatchResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        estado: status,
      },
    }));
  };

  // Submit global setting variables
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await apiFetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rondaActual: rondaSelect,
          fechaBloqueo: lockDateInput ? new Date(lockDateInput).toISOString() : undefined,
          estadoSistema: estadoSistema,
          appsScriptUrl: appsScriptUrl,
          resultadoCampeon,
          resultadoSubcampeon,
          resultadoGoleador,
          resultadoMejorJugador,
          resultadoMejorArquero,
        }),
      });

      if (!response.ok) throw new Error("Error guardando configuración.");
      setSuccessMsg("Configuración global actualizada correctamente.");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar configuración");
    } finally {
      setSavingConfig(false);
    }
  };

  // Submit matches results
  const handleSaveScores = async () => {
    setSavingScores(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const scoresPayload = Object.keys(matchResults).map((matchId) => {
      const r = matchResults[matchId];
      return {
        matchId,
        golesA: r.golesA === "" ? null : r.golesA,
        golesB: r.golesB === "" ? null : r.golesB,
        estado: r.estado,
      };
    });

    try {
      const response = await apiFetch("/api/admin/matches/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: scoresPayload }),
      });

      if (!response.ok) throw new Error("Error cargando puntuaciones.");
      setSuccessMsg("Resultados oficiales actualizados correctamente. Puntos y Ranking recalculados.");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al subir marcadores");
    } finally {
      setSavingScores(false);
    }
  };

  // Trigger AI Sync simulation
  const handleAISync = async () => {
    setSyncingAI(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await apiFetch("/api/admin/ai-sync-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Fallo en la resolución inteligente.");

      setSuccessMsg("Sincronización Inteligente exitosa! Resultados generados y ranking actualizado.");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Fallo en la simulación inteligente");
    } finally {
      setSyncingAI(false);
    }
  };

  // Pull database structure from Google Sheets (bi-directional synchronization)
  const handlePushToGoogleSheets = async () => {
    if (!appsScriptUrl) {
      setErrorMsg("Debe especificar primero la URL de la Web App de Google Apps Script para sincronizar.");
      return;
    }

    setSheetsSyncing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Execute bi-directional merge & sync on server side
      const syncResponse = await apiFetch("/api/admin/sheets/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await syncResponse.json();

      if (syncResponse.ok && data.success) {
        setSuccessMsg(data.message || "Sincronización bidireccional exitosa.");
        onRefresh(); // reload standard UI state from server to see fresh users
      } else {
        throw new Error(data.error || "Ocurrió un error al procesar el merge de datos.");
      }
    } catch (err: any) {
      setErrorMsg("Error comunicando con Google Sheets: " + err.message || err.toString());
    } finally {
      setSheetsSyncing(false);
    }
  };

  // Clear system
  const handleResetDB = async () => {
    if (!window.confirm("¿Está seguro que desea reiniciar todo el sistema? Se borrarán pronósticos cargados y se restaurarán los usuarios de prueba.")) {
      return;
    }

    setResetting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await apiFetch("/api/admin/reset", { method: "POST" });
      if (!response.ok) throw new Error();
      setSuccessMsg("Base de datos de demostración restaurada con éxito.");
      onRefresh();
    } catch (err) {
      setErrorMsg("No se pudo reiniciar la base de datos.");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserMap((prev) => ({ ...prev, [userId]: true }));
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falta de privilegios o error al eliminar usuario.");
      }

      setSuccessMsg(data.message || "Usuario eliminado exitosamente.");
      setConfirmDeleteId(null);
      onRefresh(); // Trigger global refresh of scores & elements in parent App
      await fetchDatabaseState(); // Force-refresh registered users in this view
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado al intentar borrar el usuario.");
    } finally {
      setDeletingUserMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSyncFootballApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncingFootballApi(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setApiSyncSummary(null);

    try {
      const response = await apiFetch("/api/admin/football-api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: footballProvider,
          apiKey: footballApiKey,
          leagueId: footballLeagueId,
          season: footballSeason,
          targetRound: footballTargetRound,
          autoDetectRounds: footballAutoDetect,
          syncScoresOnly: footballSyncScoresOnly,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al sincronizar con la API de fútbol.");
      }

      setSuccessMsg(`¡Sincronización con ${footballProvider} realizada con éxito!`);
      if (data.summary) {
        setApiSyncSummary(data.summary);
      }
      onRefresh(); // Refresh matches list globally
      await fetchDatabaseState(); // Refresh configurations loaded
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error en la sincronización.");
    } finally {
      setSyncingFootballApi(false);
    }
  };

  const downloadRulesPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    let y = 15;

    const addText = (
      text: string, 
      fontSize: number, 
      style: "normal" | "bold" | "italic" = "normal", 
      color: [number, number, number] = [30, 41, 59], 
      margin = 15
    ) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const splitText = doc.splitTextToSize(text, 180);
      for (const line of splitText) {
        if (y > 275) {
          doc.addPage();
          // Agregar un pequeño encabezado en páginas subsecuentes
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // Slate 400
          doc.text("PRODE Copa Mundial FIFA 2026 - Reglamento Oficial", 15, 10);
          doc.setDrawColor(241, 245, 249);
          doc.line(15, 12, 195, 12);
          y = 20;
          doc.setFont("helvetica", style);
          doc.setFontSize(fontSize);
          doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(line, margin, y);
        y += fontSize * 0.35 + 3.5;
      }
    };

    const addHeading = (text: string, level: 1 | 2 | 3) => {
      if (level === 1) {
        y += 6;
        addText(text, 12, "bold", [30, 41, 59]);
        y += 2;
      } else if (level === 2) {
        y += 4;
        addText(text, 10, "bold", [79, 70, 229]); // Indigo 600
        y += 1.5;
      } else {
        y += 2;
        addText(text, 9, "bold", [51, 65, 85]); // Slate 700
        y += 1;
      }
    };

    const addSpace = (amount: number) => {
      y += amount;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    };

    const drawLineSeparator = () => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 6;
    };

    // Dibujar encabezado estilizado en la primera página
    doc.setFillColor(79, 70, 229); // Accent Indigo
    doc.rect(15, y, 180, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("PRODE COPA MUNDIAL FIFA 2026", 20, y + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(224, 231, 255);
    doc.text("REGLAMENTO OFICIAL, PUNTUACIONES & PREGUNTAS FRECUENTES (FAQ)", 20, y + 15);
    
    y += 28;

    addText("Generado el: " + new Date().toLocaleDateString("es-ES") + " - Documento de referencia para el Administrador y Colaboradores", 9, "italic", [100, 116, 139]);
    addSpace(4);

    addHeading("1. ESQUEMA DE PUNTUACIONES BÁSICAS", 1);
    addText("Para cada partido pronosticado en la fase de eliminación directa, el resultado cargado se compara con el marcador real final del partido. Los puntos se determinan de la siguiente manera:", 9, "normal", [71, 85, 105]);
    addSpace(2);

    addText("• Acierto Exacto (+3 Puntos):", 9, "bold", [21, 128, 61]); // Emerald 700
    addText("Le pegaste al marcador matemático exacto de ambos equipos. (Ej. pronosticaste 2-1 y el resultado oficial finalizó 2-1).", 9, "normal", [100, 116, 139], 22);
    addSpace(1.5);

    addText("• Acierto Ganador o Empate (+1 Punto):", 9, "bold", [79, 70, 229]); // Indigo 600
    addText("Acertaste qué equipo ganó o que empataron, pero el marcador final no coincide con tu pronóstico exacto. (Ej. pronosticaste 3-1 y terminó 1-0).", 9, "normal", [100, 116, 139], 22);
    addSpace(1.5);

    addText("• Acierto Inválido (0 Puntos):", 9, "bold", [225, 29, 72]); // Rose 600
    addText("No acertaste ni el ganador ni el empate. Los goles o el ganador real resultaron diferentes.", 9, "normal", [100, 116, 139], 22);
    
    addSpace(3);
    addText("Nota: Se computa el resultado real de la FIFA correspondiente al partido completo, incluyendo prórrogas si se producen, pero excluyendo la tanda de penales si el encuentro se define por esa vía.", 8.5, "italic", [115, 115, 115]);

    drawLineSeparator();

    addHeading("2. MULTIPLICADORES PROGRESIVOS", 1);
    addText("Con el objetivo de incrementar la competitividad y premiar las predicciones acertadas en los momentos de mayor tensión del mundial, se aplican los siguientes multiplicadores a los puntos básicos obtenidos en cada fase:", 9, "normal", [71, 85, 105]);
    addSpace(3);

    const tableX = 15;
    // Dibujar una tabla simple basada en texto con bordes
    doc.setFillColor(248, 250, 252); // Fondo del encabezado de la tabla
    doc.rect(tableX, y, 180, 7, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(tableX, y, 180, 42); // Rectángulo exterior completo
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Fase del Mundial", tableX + 5, y + 5);
    doc.text("Multiplicador", tableX + 50, y + 5);
    doc.text("Puntos por Acierto Exacto / Ganador", tableX + 90, y + 5);
    
    doc.setFont("helvetica", "normal");
    
    const rows = [
      { fase: "16avos de Final", mult: "x1", pts: "3 Puntos (Exacto) / 1 Punto (Ganador)" },
      { fase: "Octavos de Final", mult: "x2", pts: "6 Puntos (Exacto) / 2 Puntos (Ganador)" },
      { fase: "Cuartos de Final", mult: "x3", pts: "9 Puntos (Exacto) / 3 Puntos (Ganador)" },
      { fase: "Semifinales", mult: "x4", pts: "12 Puntos (Exacto) / 4 Puntos (Ganador)" },
      { fase: "Tercer Puesto y Final", mult: "x5", pts: "15 Puntos (Exacto) / 5 Puntos (Ganador)  [🌟 MAX]" },
    ];

    let rowY = y + 7;
    rows.forEach((row, idx) => {
      doc.line(tableX, rowY, tableX + 180, rowY);
      if (idx === 4) {
        doc.setFillColor(254, 243, 199); // Fondo resaltado color ámbar
        doc.rect(tableX + 0.5, rowY + 0.5, 179, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 83, 9);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
      }
      doc.text(row.fase, tableX + 5, rowY + 5);
      doc.text(row.mult, tableX + 50, rowY + 5);
      doc.text(row.pts, tableX + 90, rowY + 5);
      rowY += 7;
    });

    y = rowY + 6;

    drawLineSeparator();

    addHeading("3. PRONÓSTICOS ESPECIALES & EXTRA PUNTOS", 1);
    
    addHeading("A) Las Ternas Especiales de Largo Plazo", 3);
    addText("Consisten en acertar el Campeón Mundial, Subcampeón, Mejor Jugador, Goleador y Mejor Arquero. Al ser predicciones a largo plazo para todo el campeonato, su ventana de carga cierra irrevocablemente antes del silbatazo inicial del primer partido oficial del Mundial. Cada acierto correcto suma valiosos puntos para el ranking final.", 9, "normal", [71, 85, 105]);
    addSpace(2);

    addHeading("B) El Pronóstico de los 32 Clasificados a Dieciseisavos", 3);
    addText("Es una mecánica única del PRODE. Consiste en seleccionar a las exactamente 32 selecciones nacionales que clasificarán de la Fase de Grupos hacia los Dieciseisavos de Final (los primeros playoffs directos).", 9, "normal", [71, 85, 105]);
    addSpace(2.5);

    addText("• Puntos Obtenidos extras:", 9, "bold", [79, 70, 229]);
    addText("Se suman de forma incremental +2 puntos por cada selección acertada que logre pasar de fase. Si el jugador acierte las 32 selecciones correctas obtendrá un bono absoluto de +64 puntos de bonificación en su puntuación global.", 9, "normal", [100, 116, 139], 22);
    addSpace(2.5);

    addText("• Fecha y Hora de Cierre irrevocable para Clasificados:", 9, "bold", [225, 29, 72]);
    addText("Definida irreprochablemente para el Miércoles 17 de Junio de 2026 a las 23:59 hs (Hora de Argentina). A partir de ese milisegundo exacto, la sección se sellará definitivamente en el servidor sin posibilidad de edición o carga tardía.", 9, "normal", [100, 116, 139], 22);

    drawLineSeparator();

    addHeading("4. ESTADOS VISUALES DEL SISTEMA Y MECANISMOS DE SEGURIDAD", 1);
    
    addHeading("Estados Habilitados y Bloqueados:", 3);
    addText("El sistema indica dinámicamente tu estado actual a través de dos distintivos visuales clave en la cabecera del fixture:", 9, "normal", [71, 85, 105]);
    addSpace(2);
    addText("• 'PRONOSTICÁ TUS RESULTADOS' (En Color Verde): Significa que el sistema está completamente abierto y la ventana de carga para los partidos de la ronda está activa. Podés registrar o modificar tus pálpitos con total libertad.", 9, "normal", [21, 128, 61], 20);
    addSpace(2);
    addText("• 'MODO LECTURA' (En Color Rojo): Significa que los controles están desactivados. En este estado la aplicación opera únicamente en modo visor, protegiendo las jugadas registradas contra alteraciones temporales.", 9, "normal", [225, 29, 72], 20);
    addSpace(3);

    addHeading("¿Cuándo se bloquean los controles y entra en Modo Lectura?", 3);
    addText("Para salvaguardar la transparencia total, el sistema sella las tarjetas bloqueando la edición por completo bajo los siguientes escenarios:", 9, "normal", [71, 85, 105]);
    addSpace(2);
    addText("- Durante la Fase de Grupos (para partidos de fixture regular), las tarjetas actúan únicamente en modo visor. No hay pronósticos individuales por partido para la fase de grupos ordinaria (estos comienzan en 16avos). Sin embargo, se puede completar el pronóstico de clasificados antes de la fecha límite.", 9, "normal", [100, 116, 139], 20);
    addSpace(1.5);
    addText("- Una vez enviado y confirmado un pronóstico por parte de un usuario, sus apuestas quedan selladas en el servidor y las tarjetas pasan a Modo Lectura.", 9, "normal", [100, 116, 139], 20);
    addSpace(1.5);
    addText("- Si el primer partido de la ronda en curso da inicio formal, el sistema automáticamente cierra la ventana de edición para toda esa ronda de forma irreversible.", 9, "normal", [100, 116, 139], 20);

    addSpace(3.5);
    addHeading("¿Cuándo abre la ventana de carga para rondas eliminatorias?", 3);
    addText("Se abre automáticamente en el instante exacto en que termina el último partido de la ronda eliminatoria previa. Las selecciones clasificadas se calculan y se habilita el fixture de la ronda siguiente inmediatamente para que los usuarios carguen sus goles.", 9, "normal", [71, 85, 105]);

    addSpace(5);
    drawLineSeparator();

    // Texto de agradecimiento al final
    addText("PRODE de Colaboradores Copa Mundial FIFA 2026 - Juego Limpio, Pasión y Transparencia.", 9, "bold", [79, 70, 229]);
    addText("Desarrollado y Auditado con Google Apps Script y base de datos persistente en Google Sheets.", 8, "normal", [148, 163, 184]);

    doc.save("Reglamento_Prode_FIFA_2026.pdf");
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div id="admin-panel" className="space-y-8">
      {/* 1. Header and logs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Panel de Administración Prode 2026</h2>
          <p className="text-xs text-slate-400">Controles privilegiados para gestionar rondas, registrar resultados y sincronizar hojas</p>
        </div>
        <button
          onClick={downloadRulesPDF}
          className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-xs font-bold text-white px-4.5 py-2.5 shadow-md shadow-indigo-100 cursor-pointer transition active:scale-95 shrink-0"
        >
          <FileDown className="h-4 w-4" />
          <span>Descargar PDF de Reglas</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* UPPER LEFTSIDE: CONFIGURATION PARAMS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-1">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Settings className="text-emerald-600 h-4 w-4" />
            Configuración Global (Google Sheets CONFIG)
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ronda Activa</label>
              <select
                id="admin-round-select"
                value={rondaSelect}
                onChange={(e) => setRondaSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="Fase de Grupos">Fase de Grupos</option>
                <option value="16avos de Final">16avos de Final</option>
                <option value="Octavos de Final">Octavos de Final</option>
                <option value="Cuartos de Final">Cuartos de Final</option>
                <option value="Semifinales">Semifinales</option>
                <option value="Partido por Tercer Puesto">Partido por Tercer Puesto</option>
                <option value="Final">Final</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de Bloqueo de Ronda</label>
              <input
                id="admin-lock-date"
                type="datetime-local"
                value={lockDateInput}
                onChange={(e) => setLockDateInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado del Sistema</label>
              <select
                id="admin-system-state"
                value={estadoSistema}
                onChange={(e) => setEstadoSistema(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Google Apps Script Web App URL</label>
              <input
                id="admin-apps-script-url"
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] focus:border-emerald-500 focus:bg-white focus:outline-none placeholder-slate-300"
              />
            </div>

            <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Resultados Oficiales de Especiales</span>
              
              <div>
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">Campeón Oficial</label>
                <select
                  value={resultadoCampeon}
                  onChange={(e) => setResultadoCampeon(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Seleccionado --</option>
                  {optionLists.teams.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">Subcampeón Oficial</label>
                <select
                  value={resultadoSubcampeon}
                  onChange={(e) => setResultadoSubcampeon(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Seleccionado --</option>
                  {optionLists.teams.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">Goleador Oficial</label>
                <select
                  value={goleadorOption}
                  onChange={(e) => handleGoleadorOptionChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Seleccionado --</option>
                  {optionLists.goleadores.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="Otro">Otro (Escribir manual)...</option>
                </select>
                {goleadorOption === "Otro" && (
                  <input
                    type="text"
                    placeholder="Escribí el goleador oficial..."
                    value={goleadorManual}
                    onChange={(e) => handleGoleadorManualChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">Mejor Jugador Oficial</label>
                <select
                  value={mejorJugadorOption}
                  onChange={(e) => handleMejorJugadorOptionChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Seleccionado --</option>
                  {optionLists.mejorJugadores.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                  <option value="Otro">Otro (Escribir manual)...</option>
                </select>
                {mejorJugadorOption === "Otro" && (
                  <input
                    type="text"
                    placeholder="Escribí el mejor jugador oficial..."
                    value={mejorJugadorManual}
                    onChange={(e) => handleMejorJugadorManualChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">Mejor Arquero Oficial</label>
                <select
                  value={mejorArqueroOption}
                  onChange={(e) => handleMejorArqueroOptionChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- No Seleccionado --</option>
                  {optionLists.mejorArqueros.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value="Otro">Otro (Escribir manual)...</option>
                </select>
                {mejorArqueroOption === "Otro" && (
                  <input
                    type="text"
                    placeholder="Escribí el mejor arquero oficial..."
                    value={mejorArqueroManual}
                    onChange={(e) => handleMejorArqueroManualChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs mt-1 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <button
              id="admin-btn-save-config"
              type="submit"
              disabled={savingConfig}
              className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-slate-800 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition disabled:opacity-55"
            >
              <Save className="h-4 w-4" />
              <span>{savingConfig ? "Guardando..." : "Guardar Parámetros"}</span>
            </button>
          </form>

          {/* Sync control deck */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="rounded-xl bg-teal-50 border border-teal-150 p-3 text-[11px] text-teal-800">
              <span className="font-extrabold block text-[10px] uppercase tracking-wider text-teal-650">⚡ Auto-Sincronización Activa</span>
              Todos los registros, pronósticos y marcadores deportivos se sincronizan automáticamente en tiempo real en la hoja de Sheets.
            </div>

            <button
              id="admin-btn-push-sheets"
              onClick={handlePushToGoogleSheets}
              disabled={sheetsSyncing}
              className="w-full inline-flex items-center justify-center space-x-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 py-2.5 text-xs font-bold hover:bg-slate-100 transition disabled:opacity-55"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{sheetsSyncing ? "Enviando..." : "Forzar Sincronización Manual"}</span>
            </button>

            <button
              id="admin-btn-reset-db"
              type="button"
              onClick={handleResetDB}
              disabled={resetting}
              className="w-full text-center text-[10px] uppercase font-bold text-rose-500 tracking-wider py-1 hover:text-rose-700 hover:underline transition"
            >
              Reiniciar Base de Datos Demo
            </button>
          </div>
        </div>

        {/* FOOTBALL API SYNC CONTROL PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-1">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <RefreshCw className="text-emerald-500 h-4 w-4 shrink-0" />
            Integración de APIs de Fútbol (Tiempo Real)
          </h3>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Conecte con proveedores de datos reales para importar calendarios y actualizar goles de los partidos en tiempo real.
          </p>

          <form onSubmit={handleSyncFootballApi} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Proveedor de Datos</label>
              <select
                id="admin-football-provider"
                value={footballProvider}
                onChange={(e) => setFootballProvider(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="football-data">Football-Data.org (Recomendado)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">API Key / Token</label>
                <a
                  href="https://www.football-data.org/client/register"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                  id="admin-link-register-fd"
                >
                  Obtener Token Gratis ↗
                </a>
              </div>
              <input
                id="admin-football-apikey"
                type="password"
                value={footballApiKey}
                onChange={(e) => setFootballApiKey(e.target.value)}
                placeholder="Ingrese su X-Auth-Token de Football-Data"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ID de Liga / Copa</label>
                <input
                  id="admin-football-leagueid"
                  type="text"
                  value={footballLeagueId}
                  onChange={(e) => setFootballLeagueId(e.target.value)}
                  placeholder="Ej: WC o 1"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Temporada (Año)</label>
                <input
                  id="admin-football-season"
                  type="text"
                  value={footballSeason}
                  onChange={(e) => setFootballSeason(e.target.value)}
                  placeholder="Ej: 2026"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* API Guidelines Hints */}
            <div className="rounded-lg bg-slate-50 p-2 text-[9px] text-slate-500 leading-normal border border-slate-100">
              <span className="font-extrabold text-slate-650 block uppercase tracking-wide mb-0.5">💡 Sugerencia de ID de Liga:</span>
              <span>
                Use <strong>WC</strong> (Copa del Mundo), <strong>PD</strong> (LaLiga España) o <strong>CL</strong> (Champions League).
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="inline-flex items-center text-[11px] font-medium text-slate-700 cursor-pointer select-none">
                <input
                  id="admin-football-autodetect"
                  type="checkbox"
                  checked={footballAutoDetect}
                  onChange={(e) => setFootballAutoDetect(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 mr-1.5"
                />
                Autodetectar Rondas de la API
              </label>

              {!footballAutoDetect && (
                <div className="pl-5">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Asignar todo a esta ronda</label>
                  <select
                    id="admin-football-targetround"
                    value={footballTargetRound}
                    onChange={(e) => setFootballTargetRound(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Fase de Grupos">Fase de Grupos</option>
                    <option value="Octavos de Final">Octavos de Final</option>
                    <option value="Cuartos de Final">Cuartos de Final</option>
                    <option value="Semifinales">Semifinales</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
              )}

              <label className="inline-flex items-center text-[11px] font-medium text-slate-700 cursor-pointer select-none block">
                <input
                  id="admin-football-scoresonly"
                  type="checkbox"
                  checked={footballSyncScoresOnly}
                  onChange={(e) => setFootballSyncScoresOnly(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 mr-1.5"
                />
                Actualizar solo marcadores (Preserva fechas/equipos)
              </label>
            </div>

            <button
              id="admin-btn-sync-football-api"
              type="submit"
              disabled={syncingFootballApi || !footballApiKey || !footballLeagueId}
              className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-extrabold shadow-sm disabled:opacity-40 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingFootballApi ? "animate-spin" : ""}`} />
              <span>{syncingFootballApi ? "Sincronizando..." : "Sincronizar Fixture & Resultados"}</span>
            </button>
          </form>

          {/* Sync Result Summary */}
          {apiSyncSummary && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-[10px] space-y-1 text-slate-650 animate-fadeIn">
              <span className="font-extrabold text-emerald-800 text-[11px] block border-b border-emerald-100/60 pb-1">✅ Resultados de Sincronización:</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div>Partidos detectados: <strong className="text-slate-800">{apiSyncSummary.totalApiReceived}</strong></div>
                <div>Creados: <strong className="text-slate-800">{apiSyncSummary.partidosCreados}</strong></div>
                <div>Actualizados: <strong className="text-slate-800">{apiSyncSummary.partidosActualizados}</strong></div>
                <div>Marcadores guardados: <strong className="text-emerald-700 font-extrabold">{apiSyncSummary.marcardoresActualizados}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHTSIDE WORKSHOP: LIVE MATCH RESULTS ENTER */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 gap-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Database className="text-emerald-600 h-4 w-4" />
              Marcadores y Resultados FIFA: Ronda Actual
            </h3>

            {/* Smart automations with AI */}
            <button
              id="admin-btn-ai-simulate"
              onClick={handleAISync}
              disabled={syncingAI}
              type="button"
              title="Resuelve automáticamente los partidos con IA según el nivel realista de cada país"
              className="inline-flex items-center space-x-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-1.5 text-xs font-bold shadow-md shadow-emerald-50 active:scale-95 transition shrink-0 disabled:opacity-55"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{syncingAI ? "Sincronizando..." : "Resolver resultados con Gemini AI"}</span>
            </button>
          </div>

          <div id="admin-matches-editor-list" className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2">
            {matches.map((m) => {
              const res = matchResults[m.matchId] || { golesA: "", golesB: "", estado: "Pendiente" };
              return (
                <div key={m.matchId} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="w-full sm:w-[45%]">
                    <div className="flex items-center space-x-1.5">
                      <span className="inline-block px-1 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">
                        {m.matchId}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize overflow-hidden text-ellipsis whitespace-nowrap">{m.estadio}</span>
                    </div>
                    <div className="font-bold text-xs text-slate-700 mt-1 flex items-center space-x-1">
                      <span>{m.equipoA}</span>
                      <span className="text-slate-350">vs</span>
                      <span>{m.equipoB}</span>
                    </div>
                  </div>

                  {/* Input form & select controls */}
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        placeholder="Gol"
                        value={res.golesA}
                        min={0}
                        onChange={(e) => handleScoreChange(m.matchId, "A", e.target.value)}
                        className="w-10 h-8 text-center rounded border border-slate-300 text-xs font-black text-slate-800"
                      />
                      <span className="text-slate-300 text-xs">-</span>
                      <input
                        type="number"
                        placeholder="Gol"
                        value={res.golesB}
                        min={0}
                        onChange={(e) => handleScoreChange(m.matchId, "B", e.target.value)}
                        className="w-10 h-8 text-center rounded border border-slate-300 text-xs font-black text-slate-800"
                      />
                    </div>

                    <select
                      value={res.estado}
                      onChange={(e) => handleStatusChange(m.matchId, e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="EnJuego">En Juego</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>
              );
            })}

            {matches.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No hay partidos cargados en la ronda activa.</p>
            )}
          </div>

          <button
            id="admin-btn-save-scores"
            type="button"
            onClick={handleSaveScores}
            disabled={savingScores || matches.length === 0}
            className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-50 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-55"
          >
            <Save className="h-4 w-4" />
            <span>{savingScores ? "Actualizando puntajes..." : "Guardar e Incrementar Puntajes"}</span>
          </button>
        </div>
      </div>

      {/* REGISTERED USERS MANAGEMENT DECK */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Users className="text-emerald-600 h-4 w-4" />
            Control de Usuarios Registrados
          </h3>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-650/10">
            {registeredUsers.length} {registeredUsers.length === 1 ? 'Usuario' : 'Usuarios'}
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          A continuación se presentan todas las personas registradas en su PRODE. Como administrador, puede ver las contraseñas en texto plano para brindar soporte, y eliminar cuentas por completo si fuera necesario. Al eliminar un usuario, <strong>se borrarán de forma inmediata todas sus predicciones y datos del ranking tanto localmente como en Sheets</strong>.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-150">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-150">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Nombre Completo</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Contraseña Plaintext</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {registeredUsers.map((user) => {
                const isSystemAdmin = user.Email.toLowerCase().trim() === "admin@prode2026.com";
                const isDeleting = deletingUserMap[user.ID];
                return (
                  <tr key={user.ID} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-400 text-[10px]">
                      {user.ID}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">
                      {user.Nombre} {user.Apellido}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {user.Email}
                    </td>
                    <td className="px-4 py-3.5 text-slate-650 font-mono">
                      <div className="flex items-center space-x-1">
                        <Key className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{user.Password}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isSystemAdmin ? (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-500/10 cursor-not-allowed">
                          Admin Principal (Inmune)
                        </span>
                      ) : confirmDeleteId === user.ID ? (
                        <div className="flex items-center justify-center space-x-1.5 animate-fadeIn">
                          <span className="text-[10px] font-extrabold text-rose-700 mr-0.5 animate-pulse">¿Borrar?</span>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteUser(user.ID)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px] tracking-tight shadow-sm transition disabled:opacity-40"
                          >
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold px-2 py-1 rounded-lg text-[10px] transition"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`admin-btn-delete-user-${user.ID}`}
                          type="button"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(user.ID)}
                          className="inline-flex items-center space-x-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-40"
                          title="Eliminar usuario y pronósticos"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{isDeleting ? "Borrando..." : "Eliminar"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {registeredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                    No hay ningún usuario registrado en la base de datos local.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOWER ROW PANEL: GOOGLE APPS SCRIPT CODE COPIER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <FileCode className="text-indigo-600 h-4 w-4" />
          Integración Oficial: Código Google Apps Script (code.gs)
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Para almacenar la información exclusivamente en <strong>Google Sheets</strong>, cree un nuevo proyecto en <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-semibold">Google Apps Script</a> que esté asociado a su Planilla de Google Sheets. Copie y pegue el código provisto debajo en el archivo <code>Código.gs</code>, guárdelo, e impleméntelo como una <strong>"Aplicación Web"</strong> (Configuración: <em>Ejecutar como: Yo, Quién tiene acceso: Cualquiera</em>). Luego copie la URL generada y colóquela en la sección de arriba.
        </p>

        <div className="relative">
          <pre className="text-[10px] font-mono bg-slate-950 text-slate-200 p-4 rounded-xl overflow-x-auto max-h-[220px] shadow-inner select-all">
            {appsScriptCode || "Cargando código..."}
          </pre>
          {appsScriptCode && (
            <button
              id="admin-btn-copy-code"
              type="button"
              onClick={copyCodeToClipboard}
              className="absolute top-2 right-2 flex items-center space-x-1 bg-slate-800/80 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold hover:bg-slate-700 hover:scale-103 transition backdrop-blur"
              title="Copiar código al portapapeles"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
