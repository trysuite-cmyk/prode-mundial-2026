// PRODE Mundial FIFA 2026 - Shared Client Types

export interface UserSession {
  token: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    fechaRegistro: string;
  };
}

export interface MatchDetailItem {
  matchId: string;
  ronda: string;
  equipoA: string;
  equipoB: string;
  fechaHora: string;
  estadio: string;
  estado: "Pendiente" | "EnJuego" | "Finalizado";
  userForecast: {
    golesA: number;
    golesB: number;
    fechaEnvio: string;
  } | null;
  realResult: {
    golesA: number | null;
    golesB: number | null;
    resultadoFinal: string | null;
  } | null;
  pointsEarned: number;
  pointCategory: "exacto" | "diferencia" | "ganador" | "empate" | "error" | null;
}

export interface LeaderboardRow {
  UsuarioID: string;
  NombreCompleto: string;
  Puntos: number;
  Posicion: number;
  AciertosExactos: number;
  AciertosGanador: number;
}

export interface HistoryItem {
  matchId: string;
  ronda: string;
  equipoA: string;
  equipoB: string;
  fechaHora: string;
  pronosticoA: number;
  pronosticoB: number;
  realA: number | null;
  realB: number | null;
  puntos: number;
  resultado: string; // "exacto" | "diferencia" | "ganador" | "empate" | "error" | "Pendiente"
}

export interface UserProfileData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  fechaRegistro: string;
  puntos: number;
  posicion: number;
  aciertosExactos: number;
  aciertosGanador: number;
  googleSheetID?: string;
  history: HistoryItem[];
}

// Helpers for Argentinian localization (UTC-3 timezone)
export function formatArgentinaDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' (Hora Arg)';
  } catch (e) {
    return isoString;
  }
}

export function formatArgentinaDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return isoString;
  }
}

export function formatArgentinaWeekdayDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const weekday = d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long'
    });
    const dateStr = d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit'
    });
    const timeStr = d.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday} ${dateStr} - ${timeStr} hs`;
  } catch (e) {
    return isoString;
  }
}

export function getMatchRoundLabel(ronda: string, fechaHoraStr: string): string {
  if (ronda === "Fase de Grupos") {
    try {
      const d = new Date(fechaHoraStr);
      if (isNaN(d.getTime())) return "FASE DE GRUPOS";
      // Argentina timezone offset
      const argTime = new Date(d.getTime() - 3 * 60 * 60 * 1000);
      const day = argTime.getUTCDate();
      if (day <= 17) return "FECHA 1";
      if (day >= 18 && day <= 22) return "FECHA 2";
      return "FECHA 3";
    } catch {
      return "FASE DE GRUPOS";
    }
  }
  
  const r = ronda.toLowerCase();
  if (r.includes("16avos") || r.includes("dieciseisavos")) return "16avos de Final";
  if (r.includes("octavos")) return "Octavos de Final";
  if (r.includes("cuartos")) return "Cuartos de Final";
  if (r.includes("semifinal")) return "Semifinales";
  if (r.includes("tercer") || r.includes("3er")) return "Tercer Puesto";
  if (r.includes("final")) return "Final";
  return ronda;
}

// 2026 FIFA World Cup - Country Flags Dictionary (ISO-3166-1 alpha-2)
export const COUNTRY_FLAGS: Record<string, string> = {
  "México": "mx",
  "Sudáfrica": "za",
  "Corea del Sur": "kr",
  "Chequia": "cz",
  "Canadá": "ca",
  "Bosnia": "ba",
  "Qatar": "qa",
  "Suiza": "ch",
  "Brasil": "br",
  "Marruecos": "ma",
  "Haití": "ht",
  "Escocia": "gb-sct",
  "EE.UU.": "us",
  "Paraguay": "py",
  "Australia": "au",
  "Turquía": "tr",
  "Alemania": "de",
  "Curazao": "cw",
  "Costa de Marfil": "ci",
  "Ecuador": "ec",
  "Países Bajos": "nl",
  "Japón": "jp",
  "Suecia": "se",
  "Túnez": "tn",
  "Bélgica": "be",
  "Egipto": "eg",
  "Irán": "ir",
  "Nueva Zelanda": "nz",
  "España": "es",
  "Cabo Verde": "cv",
  "Arabia Saudita": "sa",
  "Uruguay": "uy",
  "Francia": "fr",
  "Senegal": "sn",
  "Irak": "iq",
  "Noruega": "no",
  "Argentina": "ar",
  "Argelia": "dz",
  "Austria": "at",
  "Jordania": "jo",
  "Portugal": "pt",
  "R.D. Congo": "cd",
  "Uzbekistán": "uz",
  "Colombia": "co",
  "Inglaterra": "gb-eng",
  "Croacia": "hr",
  "Ghana": "gh",
  "Panamá": "pa"
};

export function getTeamFlagUrl(teamName: string): string | null {
  if (!teamName) return null;
  const name = teamName.trim();
  const code = COUNTRY_FLAGS[name];
  if (code) {
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  }
  return null;
}


