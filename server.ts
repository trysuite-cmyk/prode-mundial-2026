import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Dynamic Vercel DB resolution
const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = IS_VERCEL
  ? path.join("/tmp", "db.json")
  : path.join(process.cwd(), "db.json");

// Sync DB from project directory to writeable /tmp on Vercel startup
if (IS_VERCEL) {
  const sourcePath = path.join(process.cwd(), "db.json");
  if (!fs.existsSync(DB_PATH)) {
    try {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, DB_PATH);
        console.log("[Vercel] Successfully seeded db.json to writeable /tmp partition.");
      } else {
        console.warn("[Vercel] Seed db.json not found in read-only workspace.");
      }
    } catch (err) {
      console.error("[Vercel] Failed to copy db.json to /tmp:", err);
    }
  }
}

let lastGoogleSheetsSyncTime = 0;
const SYNC_THROTTLE_MS = 60 * 1000; // 1 minute throttle in serverless memory

async function maybeSyncWithSheets() {
  const now = Date.now();
  if (now - lastGoogleSheetsSyncTime > SYNC_THROTTLE_MS) {
    console.log(`[Throttled-Sync] El caché de sincronización ha expirado (último sync: ${lastGoogleSheetsSyncTime === 0 ? "nunca" : (now - lastGoogleSheetsSyncTime) + "ms atrás"}). Sincronizando con Google Sheets...`);
    lastGoogleSheetsSyncTime = now;
    await syncWithGoogleSheets().catch((err) => {
      console.error("[Throttled-Sync] Error al sincronizar con Google Sheets:", err);
    });
  }
}

app.use(express.json());

// User existence verification middleware to instantly reject deleted or non-existent accounts
app.use(async (req, res, next) => {
  // Skip logic for auth routes or health checks
  if (
    !req.path.startsWith("/api") ||
    req.path === "/api/auth/login" ||
    req.path === "/api/auth/register" ||
    req.path === "/api/health"
  ) {
    return next();
  }

  const userId = req.headers["x-user-id"] || req.headers["X-User-Id"];
  if (userId && typeof userId === "string" && userId.trim() !== "") {
    let db = readDB();
    let userExists = db.USUARIOS.some((u) => u.ID === userId);

    if (!userExists) {
      console.log(`[Security] ID de usuario "${userId}" no encontrado en el caché local de esta máquina serverless. Sincronizando con Google Sheets para re-verificar...`);
      try {
        await syncWithGoogleSheets();
        db = readDB();
        userExists = db.USUARIOS.some((u) => u.ID === userId);
      } catch (err: any) {
        console.error("[Security] Error al sincronizar con Google Sheets antes de autorizar:", err.message || err);
      }
    }

    if (!userExists) {
      console.warn(`[Security] Access denied for deleted or non-existent User ID: ${userId}`);
      return res.status(401).json({
        error: "Tu usuario ha sido eliminado o no existe en el sistema.",
        code: "USER_DELETED"
      });
    }
  }
  next();
});

// Initialize Gemini SDK if API key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Interfaces matching Google Sheets Columns
export interface ConfigRow {
  Variable: string;
  Valor: string;
}

export interface UsuarioRow {
  ID: string;
  Nombre: string;
  Apellido: string;
  Email: string;
  Password?: string; // stored plainly in this game context
  FechaRegistro: string;
  Estado: string; // "Activo" or "Inactivo"
}

export interface PartidoRow {
  MatchID: string;
  Ronda: string;
  EquipoA: string;
  EquipoB: string;
  FechaHora: string;
  Estadio: string;
  Estado: "Pendiente" | "EnJuego" | "Finalizado";
}

export interface ResultadoRow {
  MatchID: string;
  GolesA: number | null;
  GolesB: number | null;
  ResultadoFinal: string | null; // "A", "B", "Empate"
  FechaActualizacion: string;
}

export interface PronosticoRow {
  UsuarioID: string;
  MatchID: string;
  PronosticoA: number;
  PronosticoB: number;
  FechaEnvio: string;
}

export interface RankingRow {
  UsuarioID: string;
  NombreCompleto: string;
  Puntos: number;
  Posicion: number;
  AciertosExactos: number;
  AciertosGanador: number;
}

export interface PronosticoEspecialRow {
  UsuarioID: string;
  Campeon: string;
  Subcampeon: string;
  Goleador: string;
  MejorJugador: string;
  MejorArquero: string;
  Clasificados?: string;
  FechaEnvio: string;
}

interface DBStructure {
  CONFIG: ConfigRow[];
  USUARIOS: UsuarioRow[];
  PARTIDOS: PartidoRow[];
  RESULTADOS: ResultadoRow[];
  PRONOSTICOS: PronosticoRow[];
  PRONOSTICOS_ESPECIALES: PronosticoEspecialRow[];
  RANKING: RankingRow[];
}

// Default Seed Data
const DEFAULT_DB: DBStructure = {
  CONFIG: [
    { Variable: "RondaActual", Valor: "Fase de Grupos" },
    { Variable: "FechaInicioPronosticos", Valor: "2026-06-01T00:00:00Z" },
    { Variable: "FechaBloqueoRonda", Valor: "2026-06-18T02:59:00Z" },
    { Variable: "FechaBloqueoClasificados", Valor: "2026-06-18T02:59:00Z" },
    { Variable: "EstadoSistema", Valor: "Activo" },
    { Variable: "GoogleAppsScriptUrl", Valor: "https://script.google.com/macros/s/AKfycbwVzLdqlNArv7l6sQ5npXc15BpPPUP2mn5aMbGl-Ya44fwZ4YLBQZ-MsEtG07OwpLBU/exec" },
    { Variable: "ResultadoCampeon", Valor: "" },
    { Variable: "ResultadoSubcampeon", Valor: "" },
    { Variable: "ResultadoGoleador", Valor: "" },
    { Variable: "ResultadoMejorJugador", Valor: "" },
    { Variable: "ResultadoMejorArquero", Valor: "" },
    { Variable: "GoogleSheetID", Valor: "1e0u60qVoxKuTZPETd5uTrHZTPX0wpt23K_LXYEKDkzg" }
  ],
  USUARIOS: [
    {
      ID: "usr_admin",
      Nombre: "Daniel",
      Apellido: "Fernández",
      Email: "admin@prode2026.com",
      Password: "admin",
      FechaRegistro: "2026-06-08T12:00:00Z",
      Estado: "Activo"
    }
  ],
  PARTIDOS: [
    // Fase de Grupos - Selección de Partidos de Elite / Representativos del Mundial 2026
    {
      MatchID: "g_1",
      Ronda: "Fase de Grupos",
      EquipoA: "México",
      EquipoB: "Sudáfrica",
      FechaHora: "2026-06-11T16:00:00Z",
      Estadio: "Estadio Azteca, CDMX",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_2",
      Ronda: "Fase de Grupos",
      EquipoA: "EE.UU.",
      EquipoB: "Paraguay",
      FechaHora: "2026-06-12T20:00:00Z",
      Estadio: "SoFi Stadium, Los Angeles",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_3",
      Ronda: "Fase de Grupos",
      EquipoA: "Canadá",
      EquipoB: "Suiza",
      FechaHora: "2026-06-12T23:00:00Z",
      Estadio: "BC Place, Vancouver",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_4",
      Ronda: "Fase de Grupos",
      EquipoA: "Brasil",
      EquipoB: "Haití",
      FechaHora: "2026-06-13T18:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_5",
      Ronda: "Fase de Grupos",
      EquipoA: "Alemania",
      EquipoB: "Costa de Marfil",
      FechaHora: "2026-06-14T21:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_6",
      Ronda: "Fase de Grupos",
      EquipoA: "España",
      EquipoB: "Arabia Saudita",
      FechaHora: "2026-06-16T00:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_7",
      Ronda: "Fase de Grupos",
      EquipoA: "Argentina",
      EquipoB: "Argelia",
      FechaHora: "2026-06-17T01:00:00Z",
      Estadio: "Arrowhead Stadium, Kansas City",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_8",
      Ronda: "Fase de Grupos",
      EquipoA: "Francia",
      EquipoB: "Irak",
      FechaHora: "2026-06-17T22:00:00Z",
      Estadio: "Oracle Park, San Francisco",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_9",
      Ronda: "Fase de Grupos",
      EquipoA: "Portugal",
      EquipoB: "Uzbekistán",
      FechaHora: "2026-06-18T19:00:00Z",
      Estadio: "Gillette Stadium, Boston",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_10",
      Ronda: "Fase de Grupos",
      EquipoA: "Inglaterra",
      EquipoB: "Ghana",
      FechaHora: "2026-06-19T17:00:00Z",
      Estadio: "MetLife Stadium, New York",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_11",
      Ronda: "Fase de Grupos",
      EquipoA: "Argentina",
      EquipoB: "Austria",
      FechaHora: "2026-06-22T17:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_12",
      Ronda: "Fase de Grupos",
      EquipoA: "Jordania",
      EquipoB: "Argentina",
      FechaHora: "2026-06-28T02:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_13",
      Ronda: "Fase de Grupos",
      EquipoA: "Uruguay",
      EquipoB: "Túnez",
      FechaHora: "2026-06-13T20:00:00Z",
      Estadio: "NRG Stadium, Houston",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_14",
      Ronda: "Fase de Grupos",
      EquipoA: "Bélgica",
      EquipoB: "Egipto",
      FechaHora: "2026-06-14T17:00:00Z",
      Estadio: "Mercedes-Benz Stadium, Atlanta",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_15",
      Ronda: "Fase de Grupos",
      EquipoA: "Turquía",
      EquipoB: "Chequia",
      FechaHora: "2026-06-15T15:00:00Z",
      Estadio: "Lumen Field, Seattle",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_16",
      Ronda: "Fase de Grupos",
      EquipoA: "Croacia",
      EquipoB: "Ecuador",
      FechaHora: "2026-06-15T18:00:00Z",
      Estadio: "SoFi Stadium, Los Angeles",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_17",
      Ronda: "Fase de Grupos",
      EquipoA: "Colombia",
      EquipoB: "Cabo Verde",
      FechaHora: "2026-06-16T15:00:00Z",
      Estadio: "Levi's Stadium, Santa Clara",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_18",
      Ronda: "Fase de Grupos",
      EquipoA: "Marruecos",
      EquipoB: "Curazao",
      FechaHora: "2026-06-16T21:00:00Z",
      Estadio: "Arrowhead Stadium, Kansas City",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_19",
      Ronda: "Fase de Grupos",
      EquipoA: "Países Bajos",
      EquipoB: "Nueva Zelanda",
      FechaHora: "2026-06-17T18:00:00Z",
      Estadio: "Lincoln Financial Field, Philadelphia",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_20",
      Ronda: "Fase de Grupos",
      EquipoA: "Corea del Sur",
      EquipoB: "Bosnia",
      FechaHora: "2026-06-18T15:00:00Z",
      Estadio: "BC Place, Vancouver",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_21",
      Ronda: "Fase de Grupos",
      EquipoA: "Australia",
      EquipoB: "Haití",
      FechaHora: "2026-06-19T13:00:00Z",
      Estadio: "Lumen Field, Seattle",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_22",
      Ronda: "Fase de Grupos",
      EquipoA: "Japón",
      EquipoB: "Senegal",
      FechaHora: "2026-06-19T20:00:00Z",
      Estadio: "Oracle Park, San Francisco",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_23",
      Ronda: "Fase de Grupos",
      EquipoA: "España",
      EquipoB: "Suecia",
      FechaHora: "2026-06-20T17:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    },
    {
      MatchID: "g_24",
      Ronda: "Fase de Grupos",
      EquipoA: "Brasil",
      EquipoB: "Irán",
      FechaHora: "2026-06-20T21:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },

    // 16avos de Final (Cruces Oficiales - 16 partidos / 32 equipos)
    {
      MatchID: "r32_1",
      Ronda: "16avos de Final",
      EquipoA: "México",
      EquipoB: "Marruecos",
      FechaHora: "2026-06-24T18:00:00Z",
      Estadio: "Estadio Azteca, CDMX",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_2",
      Ronda: "16avos de Final",
      EquipoA: "Canadá",
      EquipoB: "Suiza",
      FechaHora: "2026-06-24T21:00:00Z",
      Estadio: "BC Place, Vancouver",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_3",
      Ronda: "16avos de Final",
      EquipoA: "EE.UU.",
      EquipoB: "Ecuador",
      FechaHora: "2026-06-25T18:00:00Z",
      Estadio: "SoFi Stadium, Los Angeles",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_4",
      Ronda: "16avos de Final",
      EquipoA: "Argentina",
      EquipoB: "Argelia",
      FechaHora: "2026-06-25T21:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_5",
      Ronda: "16avos de Final",
      EquipoA: "Brasil",
      EquipoB: "Túnez",
      FechaHora: "2026-06-26T18:00:00Z",
      Estadio: "NRG Stadium, Houston",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_6",
      Ronda: "16avos de Final",
      EquipoA: "Alemania",
      EquipoB: "Costa de Marfil",
      FechaHora: "2026-06-26T21:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_7",
      Ronda: "16avos de Final",
      EquipoA: "España",
      EquipoB: "Arabia Saudita",
      FechaHora: "2026-06-27T18:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_8",
      Ronda: "16avos de Final",
      EquipoA: "Francia",
      EquipoB: "Corea del Sur",
      FechaHora: "2026-06-27T21:00:00Z",
      Estadio: "Mercedes-Benz Stadium, Atlanta",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_9",
      Ronda: "16avos de Final",
      EquipoA: "Portugal",
      EquipoB: "Japón",
      FechaHora: "2026-06-28T18:00:00Z",
      Estadio: "Gillette Stadium, Boston",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_10",
      Ronda: "16avos de Final",
      EquipoA: "Inglaterra",
      EquipoB: "Ghana",
      FechaHora: "2026-06-28T21:00:00Z",
      Estadio: "MetLife Stadium, New York",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_11",
      Ronda: "16avos de Final",
      EquipoA: "Uruguay",
      EquipoB: "Chequia",
      FechaHora: "2026-06-29T18:00:00Z",
      Estadio: "Arrowhead Stadium, Kansas City",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_12",
      Ronda: "16avos de Final",
      EquipoA: "Bélgica",
      EquipoB: "Egipto",
      FechaHora: "2026-06-29T21:00:00Z",
      Estadio: "Lincoln Financial Field, Philadelphia",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_13",
      Ronda: "16avos de Final",
      EquipoA: "Croacia",
      EquipoB: "Bosnia",
      FechaHora: "2026-06-30T18:00:00Z",
      Estadio: "Lumen Field, Seattle",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_14",
      Ronda: "16avos de Final",
      EquipoA: "Colombia",
      EquipoB: "Turquía",
      FechaHora: "2026-06-30T21:00:00Z",
      Estadio: "Levi's Stadium, Santa Clara",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_15",
      Ronda: "16avos de Final",
      EquipoA: "Países Bajos",
      EquipoB: "Austria",
      FechaHora: "2026-07-01T18:00:00Z",
      Estadio: "Oracle Park, San Francisco",
      Estado: "Pendiente"
    },
    {
      MatchID: "r32_16",
      Ronda: "16avos de Final",
      EquipoA: "Australia",
      EquipoB: "Paraguay",
      FechaHora: "2026-07-01T21:00:00Z",
      Estadio: "NRG Stadium, Houston",
      Estado: "Pendiente"
    },

    // Octavos de Final (8 partidos / 16 equipos)
    {
      MatchID: "r16_1",
      Ronda: "Octavos de Final",
      EquipoA: "México",
      EquipoB: "Argentina",
      FechaHora: "2026-07-04T18:00:00Z",
      Estadio: "Estadio Azteca, CDMX",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_2",
      Ronda: "Octavos de Final",
      EquipoA: "Brasil",
      EquipoB: "Alemania",
      FechaHora: "2026-07-04T21:00:00Z",
      Estadio: "SoFi Stadium, Los Angeles",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_3",
      Ronda: "Octavos de Final",
      EquipoA: "España",
      EquipoB: "Francia",
      FechaHora: "2026-07-05T18:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_4",
      Ronda: "Octavos de Final",
      EquipoA: "Portugal",
      EquipoB: "Inglaterra",
      FechaHora: "2026-07-05T21:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_5",
      Ronda: "Octavos de Final",
      EquipoA: "Uruguay",
      EquipoB: "Bélgica",
      FechaHora: "2026-07-06T18:00:00Z",
      Estadio: "Mercedes-Benz Stadium, Atlanta",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_6",
      Ronda: "Octavos de Final",
      EquipoA: "Croacia",
      EquipoB: "Colombia",
      FechaHora: "2026-07-06T21:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_7",
      Ronda: "Octavos de Final",
      EquipoA: "Países Bajos",
      EquipoB: "Canadá",
      FechaHora: "2026-07-07T18:00:00Z",
      Estadio: "BC Place, Vancouver",
      Estado: "Pendiente"
    },
    {
      MatchID: "r16_8",
      Ronda: "Octavos de Final",
      EquipoA: "EE.UU.",
      EquipoB: "Australia",
      FechaHora: "2026-07-07T21:00:00Z",
      Estadio: "Arrowhead Stadium, Kansas City",
      Estado: "Pendiente"
    },

    // Cuartos de Final (4 partidos / 8 equipos)
    {
      MatchID: "qf_1",
      Ronda: "Cuartos de Final",
      EquipoA: "Argentina",
      EquipoB: "Brasil",
      FechaHora: "2026-07-10T19:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },
    {
      MatchID: "qf_2",
      Ronda: "Cuartos de Final",
      EquipoA: "Francia",
      EquipoB: "Inglaterra",
      FechaHora: "2026-07-10T22:00:00Z",
      Estadio: "SoFi Stadium, Los Angeles",
      Estado: "Pendiente"
    },
    {
      MatchID: "qf_3",
      Ronda: "Cuartos de Final",
      EquipoA: "Uruguay",
      EquipoB: "Colombia",
      FechaHora: "2026-07-11T19:00:00Z",
      Estadio: "Estadio Azteca, CDMX",
      Estado: "Pendiente"
    },
    {
      MatchID: "qf_4",
      Ronda: "Cuartos de Final",
      EquipoA: "Países Bajos",
      EquipoB: "EE.UU.",
      FechaHora: "2026-07-11T22:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    },

    // Semifinales (2 partidos / 4 equipos)
    {
      MatchID: "sf_1",
      Ronda: "Semifinales",
      EquipoA: "Argentina",
      EquipoB: "Francia",
      FechaHora: "2026-07-14T20:00:00Z",
      Estadio: "Mercedes-Benz Stadium, Atlanta",
      Estado: "Pendiente"
    },
    {
      MatchID: "sf_2",
      Ronda: "Semifinales",
      EquipoA: "Colombia",
      EquipoB: "Países Bajos",
      FechaHora: "2026-07-15T20:00:00Z",
      Estadio: "AT&T Stadium, Dallas",
      Estado: "Pendiente"
    },

    // Partido por Tercer Puesto (1 partido)
    {
      MatchID: "tp_1",
      Ronda: "Partido por Tercer Puesto",
      EquipoA: "Francia",
      EquipoB: "Colombia",
      FechaHora: "2026-07-18T18:00:00Z",
      Estadio: "Hard Rock Stadium, Miami",
      Estado: "Pendiente"
    },

    // Final (1 partido)
    {
      MatchID: "fn_1",
      Ronda: "Final",
      EquipoA: "Argentina",
      EquipoB: "Países Bajos",
      FechaHora: "2026-07-19T20:00:00Z",
      Estadio: "MetLife Stadium, New Jersey",
      Estado: "Pendiente"
    }
  ],
  RESULTADOS: [],
  PRONOSTICOS: [],
  RANKING: [],
  PRONOSTICOS_ESPECIALES: []
};

// Sync database JSON helper
function readDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data) as DBStructure;
    
    let modified = false;
    if (!parsed.PRONOSTICOS_ESPECIALES) {
      parsed.PRONOSTICOS_ESPECIALES = [];
      modified = true;
    }

    // Ensure demo/example users are automatically purged for a clean system
    const demoUserIds = ["usr_1", "usr_2", "usr_3"];
    if (parsed.USUARIOS.some((u) => demoUserIds.includes(u.ID))) {
      console.log("Purging example/demo users (usr_1, usr_2, usr_3) from localized database...");
      parsed.USUARIOS = parsed.USUARIOS.filter((u) => !demoUserIds.includes(u.ID));
      parsed.PRONOSTICOS = parsed.PRONOSTICOS.filter((p) => !demoUserIds.includes(p.UsuarioID));
      if (parsed.PRONOSTICOS_ESPECIALES) {
        parsed.PRONOSTICOS_ESPECIALES = parsed.PRONOSTICOS_ESPECIALES.filter((s) => !demoUserIds.includes(s.UsuarioID));
      }
      parsed.RANKING = parsed.RANKING.filter((r) => !demoUserIds.includes(r.UsuarioID));
      modified = true;
    }

    const defaultConfigs = [
      { Variable: "ResultadoCampeon", Valor: "" },
      { Variable: "ResultadoSubcampeon", Valor: "" },
      { Variable: "ResultadoGoleador", Valor: "" },
      { Variable: "ResultadoMejorJugador", Valor: "" },
      { Variable: "ResultadoMejorArquero", Valor: "" },
      { Variable: "GoogleSheetID", Valor: "1e0u60qVoxKuTZPETd5uTrHZTPX0wpt23K_LXYEKDkzg" }
    ];

    defaultConfigs.forEach((dc) => {
      if (!parsed.CONFIG.some((c) => c.Variable === dc.Variable)) {
        parsed.CONFIG.push(dc);
        modified = true;
      }
    });

    const gasIdx = parsed.CONFIG.findIndex((c) => c.Variable === "GoogleAppsScriptUrl");
    const targetGasUrl = "https://script.google.com/macros/s/AKfycbwVzLdqlNArv7l6sQ5npXc15BpPPUP2mn5aMbGl-Ya44fwZ4YLBQZ-MsEtG07OwpLBU/exec";
    if (gasIdx !== -1) {
      if (!parsed.CONFIG[gasIdx].Valor || parsed.CONFIG[gasIdx].Valor === "") {
        parsed.CONFIG[gasIdx].Valor = targetGasUrl;
        modified = true;
      }
    } else {
      parsed.CONFIG.push({ Variable: "GoogleAppsScriptUrl", Valor: targetGasUrl });
      modified = true;
    }

    // Auto-migration for stadium names to real 2026 World Cup venues
    let stadiumUpdated = false;
    if (parsed.PARTIDOS && Array.isArray(parsed.PARTIDOS)) {
      parsed.PARTIDOS.forEach((partido) => {
        const realStadium = formatOrAssignStadium(partido.Estadio, partido.MatchID, partido.EquipoA, partido.EquipoB, partido.Ronda);
        if (partido.Estadio !== realStadium) {
          partido.Estadio = realStadium;
          stadiumUpdated = true;
        }
      });
    }
    if (stadiumUpdated) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }

    return parsed;
  } catch (err) {
    console.error("Error reading Local DB file, using fallback:", err);
    return DEFAULT_DB;
  }
}

async function triggerGoogleSheetsSync(db: DBStructure) {
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));
  const url = configMap.get("GoogleAppsScriptUrl");
  if (!url || typeof url !== "string" || url.trim() === "" || url.includes("PLACEHOLDER") || url.trim().length < 10) {
    console.log("No valid Google Apps Script Web App URL configured, skipping auto-sync.");
    return;
  }

  try {
    const targetUrl = url.trim();
    console.log(`Auto-syncing to Google Sheets at: ${targetUrl}`);
    const body = JSON.stringify({
      action: "sync_database",
      CONFIG: db.CONFIG,
      USUARIOS: db.USUARIOS,
      PARTIDOS: db.PARTIDOS,
      RESULTADOS: db.RESULTADOS,
      PRONOSTICOS: db.PRONOSTICOS,
      PRONOSTICOS_ESPECIALES: db.PRONOSTICOS_ESPECIALES || [],
      RANKING: db.RANKING,
    });
    
    let response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    
    if (response.ok) {
      const respText = await response.text();
      console.log(`Auto-sync successful! Google Sheets response: ${respText.substring(0, 200)}`);
    } else {
      console.error(`Auto-sync returned non-ok status: ${response.status}`);
    }
  } catch (err: any) {
    console.error("Failed to automatically synchronize data to Google Sheets script:", err.message);
  }
}

function writeDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    // Fire-and-forget background synchronization to Google Sheets
    triggerGoogleSheetsSync(data).catch((err) => {
      console.error("Background Google Sheets sync failed:", err);
    });
  } catch (err) {
    console.error("Error writing to Local DB file:", err);
  }
}

function writeDBNoSync(data: DBStructure) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to Local DB file (no-sync):", err);
  }
}

// Global score calculator helper
function getMultiplier(ronda: string): number {
  const norm = ronda.toLowerCase();
  if (norm.includes("16avos")) return 1;
  if (norm.includes("octavos")) return 1.5;
  if (norm.includes("cuartos")) return 2;
  if (norm.includes("semifinal")) return 3;
  if (norm.includes("tercer puesto") || norm.includes("3") || norm.includes("bronze")) return 3;
  if (norm.includes("final")) return 5;
  return 1;
}

function calculateScore(
  pronosticoA: number,
  pronosticoB: number,
  golesA: number | null,
  golesB: number | null,
  ronda: string
): { puntos: number; tipo: "exacto" | "diferencia" | "ganador" | "empate" | "error" } {
  if (golesA === null || golesB === null) return { puntos: 0, tipo: "error" };

  const mult = getMultiplier(ronda);

  const isExact = pronosticoA === golesA && pronosticoB === golesB;
  if (isExact) {
    return { puntos: Math.round(5 * mult * 10) / 10, tipo: "exacto" };
  }

  const userDiff = pronosticoA - pronosticoB;
  const actualDiff = golesA - golesB;

  const userWinner = Math.sign(userDiff); // 1 = A, -1 = B, 0 = draw
  const actualWinner = Math.sign(actualDiff);

  if (userWinner !== actualWinner) {
    return { puntos: 0, tipo: "error" };
  }

  // Draw check (correct draw, but not exact score)
  if (userWinner === 0) {
    return { puntos: Math.round(3 * mult * 10) / 10, tipo: "empate" };
  }

  // Same winner, let's check goal difference
  if (userDiff === actualDiff) {
    return { puntos: Math.round(4 * mult * 10) / 10, tipo: "diferencia" };
  }

  // Just correct winner
  return { puntos: Math.round(3 * mult * 10) / 10, tipo: "ganador" };
}

function isPlaceholder(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return (
    lower.includes("ganador") ||
    lower.includes("perdedor") ||
    lower.includes("clasificado") ||
    lower.includes("grupo") ||
    lower.includes("tbd") ||
    lower.includes("tbc") ||
    lower.includes("play-off") ||
    lower.includes("ronda") ||
    lower.includes("octavos") ||
    lower.includes("cuartos") ||
    lower.includes("semifinal") ||
    lower.includes("final") ||
    lower === "local" ||
    lower === "visitante" ||
    lower === "—"
  );
}

function matchSpecial(userVal: string, officialVal: string): boolean {
  if (!userVal || !officialVal) return false;
  const u = userVal.trim().toLowerCase();
  const o = officialVal.trim().toLowerCase();
  if (u === o) return true;
  // Loose matching for player names (e.g. "Messi" vs "Lionel Messi", "Martinez" vs "Dibu Martinez")
  if (u.length > 3 && o.length > 3) {
    if (u.includes(o) || o.includes(u)) return true;
  }
  return false;
}

// Recalculates ranking and saves to database
function computeRankings() {
  const db = readDB();
  const resultadosCache = new Map<string, ResultadoRow>();
  db.RESULTADOS.forEach((r) => resultadosCache.set(r.MatchID, r));

  const matchCache = new Map<string, PartidoRow>();
  db.PARTIDOS.forEach((m) => matchCache.set(m.MatchID, m));

  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));

  const userStatsMap = new Map<
    string,
    { puntos: number; aciertosExactos: number; aciertosGanador: number }
  >();

  // Iterate all predictions
  db.PRONOSTICOS.forEach((pron) => {
    const res = resultadosCache.get(pron.MatchID);
    const match = matchCache.get(pron.MatchID);
    if (res && match && res.GolesA !== null && res.GolesB !== null) {
      const calc = calculateScore(pron.PronosticoA, pron.PronosticoB, res.GolesA, res.GolesB, match.Ronda);
      
      const current = userStatsMap.get(pron.UsuarioID) || { puntos: 0, aciertosExactos: 0, aciertosGanador: 0 };
      current.puntos += calc.puntos;
      if (calc.tipo === "exacto") {
        current.aciertosExactos += 1;
      } else if (calc.tipo !== "error") {
        current.aciertosGanador += 1;
      }
      userStatsMap.set(pron.UsuarioID, current);
    }
  });

  // Calculate qualified teams from Round of 32 (16avos de Final) to automatically count correct predictions!
  const qualifiedTeams = new Set<string>();
  db.PARTIDOS.forEach((p) => {
    if (p.Ronda === "16avos de Final") {
      if (p.EquipoA && !isPlaceholder(p.EquipoA)) {
        qualifiedTeams.add(p.EquipoA.trim().toLowerCase());
      }
      if (p.EquipoB && !isPlaceholder(p.EquipoB)) {
        qualifiedTeams.add(p.EquipoB.trim().toLowerCase());
      }
    }
  });

  // Compile rankings for all active users (ensure everyone has a row in RANKING list)
  const rankingList: RankingRow[] = db.USUARIOS.map((user) => {
    const stats = userStatsMap.get(user.ID) || { puntos: 0, aciertosExactos: 0, aciertosGanador: 0 };
    
    // Add special predictions points
    let specialPoints = 0;
    const spec = db.PRONOSTICOS_ESPECIALES?.find((s) => s.UsuarioID === user.ID);
    
    if (spec) {
      if (matchSpecial(spec.Campeon, configMap.get("ResultadoCampeon") || "")) specialPoints += 15;
      if (matchSpecial(spec.Subcampeon, configMap.get("ResultadoSubcampeon") || "")) specialPoints += 10;
      if (matchSpecial(spec.Goleador, configMap.get("ResultadoGoleador") || "")) specialPoints += 10;
      if (matchSpecial(spec.MejorJugador, configMap.get("ResultadoMejorJugador") || "")) specialPoints += 10;
      if (matchSpecial(spec.MejorArquero, configMap.get("ResultadoMejorArquero") || "")) specialPoints += 10;

      // Group stage 32 qualifiers bonus points (+2 per correct selection)
      if (spec.Clasificados) {
        const predictedList = spec.Clasificados.split(",").map((t) => t.trim().toLowerCase());
        let correctCount = 0;
        predictedList.forEach((teamName) => {
          if (teamName && qualifiedTeams.has(teamName)) {
            correctCount += 1;
          }
        });
        specialPoints += correctCount * 2;
      }
    }

    return {
      UsuarioID: user.ID,
      NombreCompleto: `${user.Nombre} ${user.Apellido}`,
      Puntos: Math.round((stats.puntos + specialPoints) * 10) / 10,
      Posicion: 1, // calculated below
      AciertosExactos: stats.aciertosExactos,
      AciertosGanador: stats.aciertosGanador,
    };
  });

  // Sort: descending by points, then by exact hits, then by correct winner prediction hits
  rankingList.sort((a, b) => {
    if (b.Puntos !== a.Puntos) return b.Puntos - a.Puntos;
    if (b.AciertosExactos !== a.AciertosExactos) return b.AciertosExactos - a.AciertosExactos;
    return b.AciertosGanador - a.AciertosGanador;
  });

  // Assign dense standing numbers
  let currentRank = 1;
  for (let i = 0; i < rankingList.length; i++) {
    if (i > 0) {
      const prev = rankingList[i - 1];
      const curr = rankingList[i];
      if (
        curr.Puntos < prev.Puntos ||
        (curr.Puntos === prev.Puntos && curr.AciertosExactos !== prev.AciertosExactos)
      ) {
        currentRank = i + 1;
      }
    }
    rankingList[i].Posicion = currentRank;
  }

  db.RANKING = rankingList;
  writeDB(db);
}

// Recalculates ranking and saves to database using writeDBNoSync to avoid triggering Google Sheets synchronizations
function computeRankingsNoSync() {
  const db = readDB();
  const resultadosCache = new Map<string, ResultadoRow>();
  db.RESULTADOS.forEach((r) => resultadosCache.set(r.MatchID, r));

  const matchCache = new Map<string, PartidoRow>();
  db.PARTIDOS.forEach((m) => matchCache.set(m.MatchID, m));

  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));

  const userStatsMap = new Map<
    string,
    { puntos: number; aciertosExactos: number; aciertosGanador: number }
  >();

  // Iterate all predictions
  db.PRONOSTICOS.forEach((pron) => {
    const res = resultadosCache.get(pron.MatchID);
    const match = matchCache.get(pron.MatchID);
    if (res && match && res.GolesA !== null && res.GolesB !== null) {
      const calc = calculateScore(pron.PronosticoA, pron.PronosticoB, res.GolesA, res.GolesB, match.Ronda);
      
      const current = userStatsMap.get(pron.UsuarioID) || { puntos: 0, aciertosExactos: 0, aciertosGanador: 0 };
      current.puntos += calc.puntos;
      if (calc.tipo === "exacto") {
        current.aciertosExactos += 1;
      } else if (calc.tipo !== "error") {
        current.aciertosGanador += 1;
      }
      userStatsMap.set(pron.UsuarioID, current);
    }
  });

  // Calculate qualified teams from Round of 32 (16avos de Final) to automatically count correct predictions!
  const qualifiedTeams = new Set<string>();
  db.PARTIDOS.forEach((p) => {
    if (p.Ronda === "16avos de Final") {
      if (p.EquipoA && !isPlaceholder(p.EquipoA)) {
        qualifiedTeams.add(p.EquipoA.trim().toLowerCase());
      }
      if (p.EquipoB && !isPlaceholder(p.EquipoB)) {
        qualifiedTeams.add(p.EquipoB.trim().toLowerCase());
      }
    }
  });

  // Compile rankings for all active users (ensure everyone has a row in RANKING list)
  const rankingList: RankingRow[] = db.USUARIOS.map((user) => {
    const stats = userStatsMap.get(user.ID) || { puntos: 0, aciertosExactos: 0, aciertosGanador: 0 };
    
    // Add special predictions points
    let specialPoints = 0;
    const spec = db.PRONOSTICOS_ESPECIALES?.find((s) => s.UsuarioID === user.ID);
    
    if (spec) {
      if (matchSpecial(spec.Campeon, configMap.get("ResultadoCampeon") || "")) specialPoints += 15;
      if (matchSpecial(spec.Subcampeon, configMap.get("ResultadoSubcampeon") || "")) specialPoints += 10;
      if (matchSpecial(spec.Goleador, configMap.get("ResultadoGoleador") || "")) specialPoints += 10;
      if (matchSpecial(spec.MejorJugador, configMap.get("ResultadoMejorJugador") || "")) specialPoints += 10;
      if (matchSpecial(spec.MejorArquero, configMap.get("ResultadoMejorArquero") || "")) specialPoints += 10;

      // Group stage 32 qualifiers bonus points (+2 per correct selection)
      if (spec.Clasificados) {
        const predictedList = spec.Clasificados.split(",").map((t) => t.trim().toLowerCase());
        let correctCount = 0;
        predictedList.forEach((teamName) => {
          if (teamName && qualifiedTeams.has(teamName)) {
            correctCount += 1;
          }
        });
        specialPoints += correctCount * 2;
      }
    }

    return {
      UsuarioID: user.ID,
      NombreCompleto: `${user.Nombre} ${user.Apellido}`,
      Puntos: Math.round((stats.puntos + specialPoints) * 10) / 10,
      Posicion: 1, // calculated below
      AciertosExactos: stats.aciertosExactos,
      AciertosGanador: stats.aciertosGanador,
    };
  });

  // Sort: descending by points, then by exact hits, then by correct winner prediction hits
  rankingList.sort((a, b) => {
    if (b.Puntos !== a.Puntos) return b.Puntos - a.Puntos;
    if (b.AciertosExactos !== a.AciertosExactos) return b.AciertosExactos - a.AciertosExactos;
    return b.AciertosGanador - a.AciertosGanador;
  });

  // Assign dense standing numbers
  let currentRank = 1;
  for (let i = 0; i < rankingList.length; i++) {
    if (i > 0) {
      const prev = rankingList[i - 1];
      const curr = rankingList[i];
      if (
        curr.Puntos < prev.Puntos ||
        (curr.Puntos === prev.Puntos && curr.AciertosExactos !== prev.AciertosExactos)
      ) {
        currentRank = i + 1;
      }
    }
    rankingList[i].Posicion = currentRank;
  }

  db.RANKING = rankingList;
  writeDBNoSync(db);
}

// Active Round blockade verification
function isRoundLocked(ronda: string): { locked: boolean; reason: string | null } {
  const db = readDB();
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));

  const now = new Date();

  // If the global blockade date has passed:
  const blockDateStr = configMap.get("FechaBloqueoRonda");
  if (blockDateStr) {
    const limitDate = new Date(blockDateStr);
    if (now > limitDate) {
      return { locked: true, reason: "La fecha límite para enviar pronósticos ha expirado." };
    }
  }

  // If any match in this round has already started (is EnJuego or Finalizado):
  const startedOrFinished = db.PARTIDOS.some(
    (m) => m.Ronda === ronda && (m.Estado === "EnJuego" || m.Estado === "Finalizado")
  );

  if (startedOrFinished) {
    return { locked: true, reason: "El primer partido de la ronda ya se encuentra iniciado o finalizado." };
  }

  return { locked: false, reason: null };
}

function isSpecialsLocked(): { locked: boolean; reason: string | null } {
  const db = readDB();
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));

  const now = new Date();

  // 1. If any match in the tournament is EnJuego or Finalizado, specials are locked!
  const tournamentStarted = db.PARTIDOS.some(
    (m) => m.Estado === "EnJuego" || m.Estado === "Finalizado"
  );
  if (tournamentStarted) {
    return { locked: true, reason: "La Copa Mundial FIFA 2026 ya ha comenzado. Las ternas especiales están bloqueadas." };
  }

  // 2. Check general lock date limit
  const blockDateStr = configMap.get("FechaBloqueoRonda");
  if (blockDateStr) {
    const limitDate = new Date(blockDateStr);
    if (now > limitDate) {
      return { locked: true, reason: "La fecha límite general para enviar pronósticos ha expirado." };
    }
  }

  return { locked: false, reason: null };
}

function isClasificadosLocked(): { locked: boolean; reason: string | null } {
  const db = readDB();
  const now = new Date();

  // Check custom configuration variable
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));
  const customLimit = configMap.get("FechaBloqueoClasificados");
  
  // Default to June 17, 2026 at 23:59:00 Argentina time (UTC-3) => "2026-06-18T02:59:00Z"
  const limitDateStr = customLimit || "2026-06-18T02:59:00Z";
  const limitDate = new Date(limitDateStr);

  if (now > limitDate) {
    return { 
      locked: true, 
      reason: "La fecha límite para enviar los 32 clasificados ha expirado (Miércoles 17 de Junio de 2026, 23:59 hs Arg)." 
    };
  }

  return { locked: false, reason: null };
}

// API Routes

// Health / Status Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET Database Schema download for Google Sheets configuration (Variables export)
app.get("/api/admin/sheet-structure", async (req, res) => {
  try {
    await maybeSyncWithSheets();
  } catch (err: any) {
    console.error("[sheet-structure] Failed to run sync logic:", err.message || err);
  }
  const db = readDB();
  res.json({
    sheets: {
      CONFIG: db.CONFIG,
      USUARIOS: db.USUARIOS, // include password plaintext as requested by user
      PARTIDOS: db.PARTIDOS,
      RESULTADOS: db.RESULTADOS,
      PRONOSTICOS: db.PRONOSTICOS,
      RANKING: db.RANKING,
    },
  });
});

// Team name translation mapping between English raw API team names and our local Spanish ones
const TEAM_MAP: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czechia": "Chequia",
  "Czech Republic": "Chequia",
  "Canada": "Canadá",
  "Bosnia-Herzegovina": "Bosnia",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia & Herzegovina": "Bosnia",
  "Qatar": "Qatar",
  "Switzerland": "Suiza",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "United States": "EE.UU.",
  "USA": "EE.UU.",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Germany": "Alemania",
  "Curaçao": "Curazao",
  "Curacao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Côte d'Ivoire": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Netherlands": "Países Bajos",
  "Japan": "Japón",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  "Spain": "España",
  "Cape Verde": "Cabo Verde",
  "Cape Verde Islands": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita",
  "Uruguay": "Uruguay",
  "France": "Francia",
  "Senegal": "Senegal",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "Portugal": "Portugal",
  "Congo DR": "R.D. Congo",
  "DR Congo": "R.D. Congo",
  "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Ghana": "Ghana",
  "Panama": "Panamá"
};

function translateTeam(name: string): string {
  if (!name) return name;
  const trimmed = name.trim();
  if (TEAM_MAP[trimmed]) {
    return TEAM_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const [englishKey, spanishVal] of Object.entries(TEAM_MAP)) {
    if (englishKey.toLowerCase() === lower) {
      return spanishVal;
    }
  }
  return trimmed;
}

// Helper to normalize round status
function detectRoundName(rawRound: string | undefined, defaultRound: string): string {
  if (!rawRound) return defaultRound;
  const normalized = rawRound.toLowerCase().trim();
  if (normalized.includes("group") || normalized.includes("grupo")) return "Fase de Grupos";
  if (normalized.includes("32") || normalized.includes("1/16") || normalized.includes("sixteenth")) return "16avos de Final";
  if (normalized.includes("16") || normalized.includes("octavos") || normalized.includes("round of 16") || normalized.includes("1/8")) return "Octavos de Final";
  if (normalized.includes("quarter") || normalized.includes("cuartos") || normalized.includes("1/4")) return "Cuartos de Final";
  if (normalized.includes("semi") || normalized.includes("1/2")) return "Semifinales";
  if (normalized.includes("third") || normalized.includes("3rd") || normalized.includes("tercer") || normalized.includes("bronze")) return "Partido por Tercer Puesto";
  if (normalized.includes("final")) return "Final";
  return defaultRound;
}

// REAL 2026 WORLD CUP STADIUMS DICTIONARIES & MAPPING UTILITIES
const REAL_STADIUM_MAP: Record<string, string> = {
  "Estadio Azteca": "Estadio Azteca, Ciudad de México",
  "Azteca": "Estadio Azteca, Ciudad de México",
  "Estadio Akron": "Estadio Akron, Guadalajara",
  "Akron": "Estadio Akron, Guadalajara",
  "Estadio BBVA": "Estadio BBVA, Monterrey",
  "BBVA": "Estadio BBVA, Monterrey",
  "BC Place": "Estadio BC Place, Vancouver",
  "BMO Field": "Estadio BMO Field, Toronto",
  "MetLife Stadium": "Estadio MetLife, Nueva York / Nueva Jersey",
  "MetLife": "Estadio MetLife, Nueva York / Nueva Jersey",
  "SoFi Stadium": "Estadio SoFi, Los Ángeles",
  "SoFi": "Estadio SoFi, Los Ángeles",
  "AT&T Stadium": "Estadio AT&T, Dallas",
  "AT&T": "Estadio AT&T, Dallas",
  "Mercedes-Benz Stadium": "Estadio Mercedes-Benz, Atlanta",
  "Mercedes-Benz": "Estadio Mercedes-Benz, Atlanta",
  "Hard Rock Stadium": "Estadio Hard Rock, Miami",
  "Hard Rock": "Estadio Hard Rock, Miami",
  "Gillette Stadium": "Estadio Gillette, Boston",
  "Gillette": "Estadio Gillette, Boston",
  "NRG Stadium": "Estadio NRG, Houston",
  "NRG": "Estadio NRG, Houston",
  "Arrowhead Stadium": "Estadio Arrowhead, Kansas City",
  "Arrowhead": "Estadio Arrowhead, Kansas City",
  "Lincoln Financial Field": "Estadio Lincoln Financial Field, Filadelfia",
  "Lincoln Financial": "Estadio Lincoln Financial Field, Filadelfia",
  "Levi's Stadium": "Estadio Levi's, San Francisco",
  "Levi's": "Estadio Levi's, San Francisco",
  "Lumen Field": "Estadio Lumen Field, Seattle",
  "Lumen": "Estadio Lumen Field, Seattle"
};

const VENUES = [
  "Estadio Azteca, Ciudad de México",
  "Estadio MetLife, Nueva York / Nueva Jersey",
  "Estadio SoFi, Los Ángeles",
  "Estadio AT&T, Dallas",
  "Estadio Mercedes-Benz, Atlanta",
  "Estadio Hard Rock, Miami",
  "Estadio BC Place, Vancouver",
  "Estadio BMO Field, Toronto",
  "Estadio BBVA, Monterrey",
  "Estadio Akron, Guadalajara",
  "Estadio Gillette, Boston",
  "Estadio NRG, Houston",
  "Estadio Arrowhead, Kansas City",
  "Estadio Lincoln Financial Field, Filadelfia",
  "Estadio Levi's, San Francisco",
  "Estadio Lumen Field, Seattle"
];

function assignRealStadium(matchId: string, equipoA: string, equipoB: string, ronda?: string): string {
  const cleanA = (equipoA || "").trim();
  const cleanB = (equipoB || "").trim();
  
  if (cleanA === "México" || cleanB === "México") {
    if (matchId.includes("537327") || matchId.includes("g_1")) return "Estadio Azteca, Ciudad de México";
    const hash = matchId ? matchId.charCodeAt(matchId.length - 1) : 0;
    return hash % 2 === 0 ? "Estadio BBVA, Monterrey" : "Estadio Akron, Guadalajara";
  }
  if (cleanA === "Canadá" || cleanB === "Canadá") {
    if (matchId.includes("537333") || matchId.includes("g_3")) return "Estadio BMO Field, Toronto";
    return "Estadio BC Place, Vancouver";
  }
  if (cleanA === "EE.UU." || cleanB === "EE.UU." || cleanA === "Estados Unidos" || cleanB === "Estados Unidos") {
    if (matchId.includes("537345") || matchId.includes("g_2")) return "Estadio SoFi, Los Ángeles";
    return "Estadio MetLife, Nueva York / Nueva Jersey";
  }
  
  const normalizedRound = detectRoundName(ronda, "Fase de Grupos");
  if (normalizedRound === "Final") {
    return "Estadio MetLife, Nueva York / Nueva Jersey";
  }
  if (normalizedRound === "Partido por Tercer Puesto") {
    return "Estadio Hard Rock, Miami";
  }
  if (normalizedRound === "Semifinales") {
    const hash = matchId ? matchId.charCodeAt(matchId.length - 1) : 0;
    return hash % 2 === 0 ? "Estadio AT&T, Dallas" : "Estadio Mercedes-Benz, Atlanta";
  }
  if (normalizedRound === "Cuartos de Final") {
    const quarters = [
      "Estadio SoFi, Los Ángeles",
      "Estadio Gillette, Boston",
      "Estadio Hard Rock, Miami",
      "Estadio Arrowhead, Kansas City"
    ];
    const hash = matchId ? matchId.charCodeAt(matchId.length - 1) : 0;
    return quarters[hash % quarters.length];
  }
  
  const str = matchId + cleanA + cleanB;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % VENUES.length;
  return VENUES[index];
}

function formatOrAssignStadium(rawVenue: string | undefined, matchId: string, equipoA: string, equipoB: string, rondaText?: string): string {
  if (!rawVenue || rawVenue.trim() === "" || rawVenue.toLowerCase().includes("estadio real") || rawVenue.toLowerCase() === "tbd" || rawVenue.toLowerCase() === "to be determined") {
    return assignRealStadium(matchId, equipoA, equipoB, rondaText);
  }
  
  const trimmed = rawVenue.trim();
  if (REAL_STADIUM_MAP[trimmed]) return REAL_STADIUM_MAP[trimmed];
  
  const lower = trimmed.toLowerCase();
  for (const [englishKey, spanishVal] of Object.entries(REAL_STADIUM_MAP)) {
    if (lower.includes(englishKey.toLowerCase())) {
      return spanishVal;
    }
  }
  return trimmed;
}

// FOODBALL APIs SYNC ENDPOINTS
interface SyncParams {
  provider?: string;
  apiKey?: string;
  leagueId?: string;
  season?: string;
  targetRound?: string;
  autoDetectRounds?: boolean;
  syncScoresOnly?: boolean;
}

async function executeFootballApiSync(params: SyncParams) {
  const provider = params.provider || "football-data";
  let apiKey = params.apiKey;
  if (!apiKey && provider === "football-data") {
    apiKey = "a727a7bca89e4f62a7c5472e1292b2e6";
  }

  const leagueId = params.leagueId || "WC";
  const season = params.season || "2026";
  const autoDetectRounds = params.autoDetectRounds !== false; // default true
  const syncScoresOnly = params.syncScoresOnly === true; // default false

  if (!provider || !apiKey || !leagueId) {
    throw new Error("Falta configurar el Proveedor, la API Key o el ID de la Liga.");
  }

  const db = readDB();
  const currentDefaultRound = db.CONFIG.find((c) => c.Variable === "RondaActual")?.Valor || "Fase de Grupos";
  const finalDefaultRound = params.targetRound || currentDefaultRound;

  let apiMatches: any[] = [];
  const nowStr = new Date().toISOString();

  if (provider === "api-football") {
    const seasonValue = season || "2026";
    const url = `https://v3.football.api-sports.io/fixtures?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(seasonValue)}`;
    console.log(`[Auto-Sync] Fetching from API-Football: ${url}`);
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "x-rapidapi-key": apiKey
      }
    });
    if (!response.ok) {
      throw new Error(`API-Football respondió error HTTP: ${response.status}`);
    }
    const json = await response.json();
    if (json.errors && Object.keys(json.errors).length > 0 && !json.response) {
      throw new Error(`La API de API-Football devolvió un error: ${JSON.stringify(json.errors)}`);
    }
    apiMatches = json.response || [];
  } else if (provider === "football-data") {
    const seasonSuffix = season ? `?season=${encodeURIComponent(season)}` : "";
    const url = `https://api.football-data.org/v4/competitions/${encodeURIComponent(leagueId)}/matches${seasonSuffix}`;
    console.log(`[Auto-Sync] Fetching from Football-Data: ${url}`);
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiKey
      }
    });
    if (!response.ok) {
      throw new Error(`Football-Data.org respondió error HTTP: ${response.status}`);
    }
    const json = await response.json();
    apiMatches = json.matches || [];
  } else if (provider === "sportmonks") {
    const seasonFilter = season ? `&filter[season_ids]=${encodeURIComponent(season)}` : "";
    const url = `https://api.sportmonks.com/v3/football/fixtures?api_token=${encodeURIComponent(apiKey)}&filter[league_ids]=${encodeURIComponent(leagueId)}${seasonFilter}&include=participants;venue`;
    console.log(`[Auto-Sync] Fetching from Sportmonks: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sportmonks respondió error HTTP: ${response.status}`);
    }
    const json = await response.json();
    apiMatches = json.data || [];
  } else {
    throw new Error("Proveedor de API no soportado.");
  }

  if (apiMatches.length === 0) {
    throw new Error("No se encontraron partidos para la Liga/Temporada indicada. Verifique la API Key.");
  }

  // Modernize configuration values so they persist
  const addOrUpdateConfig = (variable: string, valor: string) => {
    const idx = db.CONFIG.findIndex((c) => c.Variable === variable);
    if (idx !== -1) {
      db.CONFIG[idx].Valor = valor;
    } else {
      db.CONFIG.push({ Variable: variable, Valor: valor });
    }
  };
  addOrUpdateConfig("FootballApiProvider", provider);
  addOrUpdateConfig("FootballApiKey", apiKey);
  addOrUpdateConfig("FootballLeagueID", leagueId);
  if (season) addOrUpdateConfig("FootballSeason", season);

  let createdCount = 0;
  let updatedMatchesCount = 0;
  let scoreSavesCount = 0;

  // Loop matches and map them to Database schema
  apiMatches.forEach((item: any) => {
    let matchId = "";
    let equipoA = "";
    let equipoB = "";
    let fechaHora = "";
    let estadio = "";
    let rawRoundText = "";
    let computedStatus: "Pendiente" | "EnJuego" | "Finalizado" = "Pendiente";
    let golesA: number | null = null;
    let golesB: number | null = null;

    if (provider === "api-football") {
      matchId = `api_f_${item.fixture?.id}`;
      equipoA = item.teams?.home?.name || "Local";
      equipoB = item.teams?.away?.name || "Visitante";
      fechaHora = item.fixture?.date || nowStr;
      estadio = item.fixture?.venue?.name || "Estadio Real";
      rawRoundText = item.league?.round || "";
      const stat = item.fixture?.status?.short || "NS";
      if (["FT", "AET", "PEN"].includes(stat)) {
        computedStatus = "Finalizado";
      } else if (["1H", "2H", "HT", "ET", "P"].includes(stat)) {
        computedStatus = "EnJuego";
      }
      golesA = item.goals?.home;
      golesB = item.goals?.away;

    } else if (provider === "football-data") {
      matchId = `fd_${item.id}`;
      equipoA = item.homeTeam?.name || "Local";
      equipoB = item.awayTeam?.name || "Visitante";
      fechaHora = item.utcDate || nowStr;
      estadio = item.venue || "Estadio Real";
      rawRoundText = item.stage || "";
      const stat = item.status || "TIMED";
      if (["FINISHED", "AWARDED"].includes(stat)) {
        computedStatus = "Finalizado";
      } else if (["IN_PLAY", "PAUSED", "LIVE"].includes(stat)) {
        computedStatus = "EnJuego";
      }
      golesA = item.score?.fullTime?.home;
      golesB = item.score?.fullTime?.away;

    } else if (provider === "sportmonks") {
      matchId = `sm_${item.id}`;
      const homeNode = item.participants?.find((p: any) => p.meta?.location === "home") || item.participants?.[0];
      const awayNode = item.participants?.find((p: any) => p.meta?.location === "away") || item.participants?.[1];
      equipoA = homeNode?.name || "Local";
      equipoB = awayNode?.name || "Visitante";
      fechaHora = item.starting_at ? new Date(item.starting_at).toISOString() : nowStr;
      estadio = item.venue?.name || "Estadio Real";
      rawRoundText = "";

      const statState = item.state?.state || "NS";
      if (["FT", "AET", "PEN"].includes(statState)) {
        computedStatus = "Finalizado";
      } else if (["LIVE", "HT", "1H", "2H", "ET"].includes(statState)) {
        computedStatus = "EnJuego";
      }

      if (item.scores && Array.isArray(item.scores) && homeNode && awayNode) {
        const homeScoreObj = item.scores.find((s: any) => s.participant_id === homeNode.id && ["CURRENT", "FT"].includes(s.description));
        const awayScoreObj = item.scores.find((s: any) => s.participant_id === awayNode.id && ["CURRENT", "FT"].includes(s.description));
        if (homeScoreObj) golesA = homeScoreObj.score?.goals;
        if (awayScoreObj) golesB = awayScoreObj.score?.goals;
      }
    }

    // Translate English names from api to beautiful Spanish team names
    equipoA = translateTeam(equipoA);
    equipoB = translateTeam(equipoB);

    // Format or assign real stadium location
    estadio = formatOrAssignStadium(estadio, matchId, equipoA, equipoB, rawRoundText);

    const rondaAsignada = autoDetectRounds ? detectRoundName(rawRoundText, finalDefaultRound) : finalDefaultRound;

    const existingMatchIdx = db.PARTIDOS.findIndex((p) => p.MatchID === matchId);

    if (existingMatchIdx !== -1) {
      if (!syncScoresOnly) {
        db.PARTIDOS[existingMatchIdx].EquipoA = equipoA;
        db.PARTIDOS[existingMatchIdx].EquipoB = equipoB;
        db.PARTIDOS[existingMatchIdx].FechaHora = fechaHora;
        db.PARTIDOS[existingMatchIdx].Estadio = estadio;
        db.PARTIDOS[existingMatchIdx].Ronda = rondaAsignada;
      }
      db.PARTIDOS[existingMatchIdx].Estado = computedStatus;
      updatedMatchesCount++;
    } else if (!syncScoresOnly) {
      db.PARTIDOS.push({
        MatchID: matchId,
        Ronda: rondaAsignada,
        EquipoA: equipoA,
        EquipoB: equipoB,
        FechaHora: fechaHora,
        Estadio: estadio,
        Estado: computedStatus,
      });
      createdCount++;
    }

    if (golesA !== null && golesB !== null && (computedStatus === "Finalizado" || computedStatus === "EnJuego")) {
      const resIdx = db.RESULTADOS.findIndex((r) => r.MatchID === matchId);
      const outcome = golesA > golesB ? "A" : golesA < golesB ? "B" : "Empate";

      if (resIdx !== -1) {
        db.RESULTADOS[resIdx].GolesA = golesA;
        db.RESULTADOS[resIdx].GolesB = golesB;
        db.RESULTADOS[resIdx].ResultadoFinal = outcome;
        db.RESULTADOS[resIdx].FechaActualizacion = nowStr;
      } else {
        db.RESULTADOS.push({
          MatchID: matchId,
          GolesA: golesA,
          GolesB: golesB,
          ResultadoFinal: outcome,
          FechaActualizacion: nowStr,
        });
      }
      scoreSavesCount++;
    }
  });

  writeDB(db);
  computeRankings();

  return {
    totalApiReceived: apiMatches.length,
    partidosCreados: createdCount,
    partidosActualizados: updatedMatchesCount,
    marcardoresActualizados: scoreSavesCount,
  };
}

app.post("/api/admin/football-api/sync", async (req, res) => {
  try {
    const { provider, apiKey, leagueId, season, targetRound, autoDetectRounds, syncScoresOnly } = req.body;
    const summary = await executeFootballApiSync({
      provider,
      apiKey,
      leagueId,
      season,
      targetRound,
      autoDetectRounds,
      syncScoresOnly
    });

    res.json({
      success: true,
      message: `Sincronización con ${provider || "football-data"} realizada exitosamente de forma automática.`,
      summary
    });
  } catch (err: any) {
    console.error("Error doing Football API synchronization endpoint:", err);
    res.status(500).json({ error: `Fallo durante la sincronización: ${err.message || err}` });
  }
});

// SPECIALS DROPDOWN OPTIONS ENDPOINT
app.get("/api/specials/options", (req, res) => {
  const db = readDB();
  const teamsSet = new Set<string>();

  db.PARTIDOS.forEach((p) => {
    if (p.EquipoA && !isPlaceholder(p.EquipoA)) {
      teamsSet.add(p.EquipoA.trim());
    }
    if (p.EquipoB && !isPlaceholder(p.EquipoB)) {
      teamsSet.add(p.EquipoB.trim());
    }
  });

  const fallbackTeams = [
    "Alemania", "Argentina", "Bélgica", "Brasil", "Canadá", "Colombia", "Corea del Sur", "Croacia",
    "Ecuador", "España", "EE.UU.", "Francia", "Inglaterra", "Italia", "Japón", "Marruecos",
    "México", "Países Bajos", "Portugal", "Senegal", "Suiza", "Uruguay"
  ];

  if (teamsSet.size === 0) {
    fallbackTeams.forEach(t => teamsSet.add(t));
  }

  const teamsResult = Array.from(teamsSet).sort((a, b) => a.localeCompare(b));

  const GOLEADORES = [
    "Lionel Messi", "Kylian Mbappé", "Lautaro Martínez", "Julián Álvarez", "Erling Haaland",
    "Vinícius Júnior", "Harry Kane", "Jude Bellingham", "Robert Lewandowski", "Cristiano Ronaldo",
    "Darwin Núñez", "Luis Díaz", "Rodrygo", "Phil Foden", "Bukayo Saka", "Lamine Yamal",
    "Antoine Griezmann", "Romelu Lukaku", "Alvaro Morata", "Florian Wirtz", "Jamal Musiala"
  ].sort();

  const JUGADORES = [
    "Lionel Messi", "Kylian Mbappé", "Jude Bellingham", "Vinícius Júnior", "Rodri", "Kevin De Bruyne",
    "Lamine Yamal", "Florian Wirtz", "Jamal Musiala", "Alexis Mac Allister", "Enzo Fernández",
    "Federico Valverde", "Harry Kane", "Cole Palmer", "Antoine Griezmann", "Bernardo Silva",
    "Bruno Fernandes", "Luka Modric"
  ].sort();

  const ARQUEROS = [
    "Emiliano Martínez", "Thibaut Courtois", "Alisson Becker", "Ederson", "Marc-André ter Stegen",
    "Gianluigi Donnarumma", "Jan Oblak", "Mike Maignan", "Jordan Pickford", "Unai Simón",
    "Manuel Neuer", "Yann Sommer", "Diogo Costa"
  ].sort();

  res.json({
    teams: teamsResult,
    goleadores: GOLEADORES,
    mejorJugadores: JUGADORES,
    mejorArqueros: ARQUEROS
  });
});

// DELETE User by ID (Admin command)
app.delete("/api/admin/users/:id", async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: "Falta el ID del usuario." });
  }

  const db = readDB();
  const user = db.USUARIOS.find((u) => u.ID === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  // Prevent deleting the main admin user
  if (user.Email.toLowerCase().trim() === "admin@prode2026.com") {
    return res.status(403).json({ error: "No se puede eliminar la cuenta principal de administrador." });
  }

  // 1. Remove user
  db.USUARIOS = db.USUARIOS.filter((u) => u.ID !== userId);

  // 2. Remove user forecasts
  db.PRONOSTICOS = db.PRONOSTICOS.filter((p) => p.UsuarioID !== userId);

  // 3. Remove user tournament specials forecasts if any
  if (db.PRONOSTICOS_ESPECIALES) {
    db.PRONOSTICOS_ESPECIALES = db.PRONOSTICOS_ESPECIALES.filter((s) => s.UsuarioID !== userId);
  }

  // 4. Remove ranking entry
  db.RANKING = db.RANKING.filter((r) => r.UsuarioID !== userId);

  // Save changes locally without starting asynchronous trigger
  writeDBNoSync(db);

  // Recalculate rankings locally without starting asynchronous trigger
  computeRankingsNoSync();

  // Read clean final state and push is synchronously to Google Sheets Web App
  const finalDb = readDB();
  try {
    console.log(`[Admin-Delete] Sincronizando purga de usuario de manera síncrona en Google Sheets para el ID: ${userId}`);
    await triggerGoogleSheetsSync(finalDb);
    console.log(`[Admin-Delete] Sincronización síncrona exitosa.`);
  } catch (syncErr: any) {
    console.error(`[Admin-Delete] Error en sincronización síncrona con Google Sheets:`, syncErr?.message || syncErr);
  }

  res.json({ success: true, message: `El usuario ${user.Nombre} ${user.Apellido} fue eliminado con éxito en el sistema y en todas las pestañas de Google Sheets.` });
});

// AUTH - Signup / Registro
app.post("/api/auth/register", async (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  const db = readDB();
  const emailLower = email.toLowerCase().trim();

  const userExists = db.USUARIOS.some((u) => u.Email.toLowerCase().trim() === emailLower);
  if (userExists) {
    return res.status(400).json({ error: "El correo electrónico ya se encuentra registrado." });
  }

  const newId = `usr_${Date.now()}`;
  const newUser: UsuarioRow = {
    ID: newId,
    Nombre: nombre.trim(),
    Apellido: apellido.trim(),
    Email: emailLower,
    Password: password,
    FechaRegistro: new Date().toISOString(),
    Estado: "Activo",
  };

  db.USUARIOS.push(newUser);
  writeDBNoSync(db);
  computeRankingsNoSync();

  const finalDb = readDB();
  try {
    console.log(`[Register] Sincronizando nuevo usuario de manera síncrona en Google Sheets para: ${emailLower}`);
    await triggerGoogleSheetsSync(finalDb);
    console.log(`[Register] Sincronización síncrona de registro exitosa.`);
  } catch (syncErr: any) {
    console.error(`[Register] Error en sincronización síncrona con Google Sheets durante registro:`, syncErr?.message || syncErr);
  }

  res.status(201).json({
    id: newUser.ID,
    nombre: newUser.Nombre,
    apellido: newUser.Apellido,
    email: newUser.Email,
  });
});

// AUTH - Session Check (Heartbeat verification)
app.get("/api/auth/session-check", (req, res) => {
  const userId = req.headers["x-user-id"] || req.headers["X-User-Id"];
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(401).json({ error: "No se identificó ningún identificador del usuario.", code: "NO_SESSION" });
  }

  const db = readDB();
  const user = db.USUARIOS.find((u) => u.ID === userId);
  if (!user) {
    return res.status(401).json({ error: "Tu usuario ha sido eliminado o no existe en el sistema.", code: "USER_DELETED" });
  }

  if (user.Estado !== "Activo") {
    return res.status(401).json({ error: "Tu cuenta ha sido desactivada por el administrador.", code: "USER_INACTIVE" });
  }

  res.json({ success: true, active: true });
});

// AUTH - Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Correo electrónico y contraseña requeridos." });
  }

  let db = readDB();
  const emailLower = email.toLowerCase().trim();

  let user = db.USUARIOS.find(
    (u) => u.Email.toLowerCase().trim() === emailLower && u.Password === password
  );

  if (!user) {
    console.log(`[Login] Usuario "${emailLower}" no encontrado localmente. Sincronizando con Google Sheets...`);
    try {
      await syncWithGoogleSheets();
      db = readDB();
      user = db.USUARIOS.find(
        (u) => u.Email.toLowerCase().trim() === emailLower && u.Password === password
      );
    } catch (err: any) {
      console.error("[Login] Error al sincronizar con Google Sheets para verificar inicio de sesión:", err.message || err);
    }
  }

  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  if (user.Estado !== "Activo") {
    return res.status(403).json({ error: "Esta cuenta está inactiva." });
  }

  res.json({
    token: `token_${user.ID}_${Math.random().toString(36).substring(2, 8)}`,
    user: {
      id: user.ID,
      nombre: user.Nombre,
      apellido: user.Apellido,
      email: user.Email,
      fechaRegistro: user.FechaRegistro,
    },
  });
});

// GET matches with predictions for a user
app.get("/api/matches", async (req, res) => {
  try {
    await maybeSyncWithSheets();
  } catch (err: any) {
    console.error("[Matches] Error en sincronización con Google Sheets:", err.message || err);
  }
  const userId = req.headers["x-user-id"] as string;
  const db = readDB();

  // Get current active round
  const activeRound = db.CONFIG.find((c) => c.Variable === "RondaActual")?.Valor || "Fase de Grupos";
  const lockStatus = isRoundLocked(activeRound);

  // Filter matches for the active round
  const matches = db.PARTIDOS.filter((p) => p.Ronda === activeRound);

  // Grab predictions of this user
  const predictions = db.PRONOSTICOS.filter((pr) => pr.UsuarioID === userId);
  const resultsMap = new Map<string, ResultadoRow>();
  db.RESULTADOS.forEach((r) => resultsMap.set(r.MatchID, r));

  const list = matches.map((m) => {
    const pred = predictions.find((p) => p.MatchID === m.MatchID);
    const result = resultsMap.get(m.MatchID);

    let calculatedPoints = 0;
    let pointCategory: string | null = null;
    if (result && result.GolesA !== null && result.GolesB !== null && pred) {
      const calcResult = calculateScore(pred.PronosticoA, pred.PronosticoB, result.GolesA, result.GolesB, m.Ronda);
      calculatedPoints = calcResult.puntos;
      pointCategory = calcResult.tipo;
    }

    return {
      matchId: m.MatchID,
      ronda: m.Ronda,
      equipoA: m.EquipoA,
      equipoB: m.EquipoB,
      fechaHora: m.FechaHora,
      estadio: m.Estadio,
      estado: m.Estado,
      userForecast: pred
        ? {
            golesA: pred.PronosticoA,
            golesB: pred.PronosticoB,
            fechaEnvio: pred.FechaEnvio,
          }
        : null,
      realResult: result
        ? {
            golesA: result.GolesA,
            golesB: result.GolesB,
            resultadoFinal: result.ResultadoFinal,
          }
        : null,
      pointsEarned: calculatedPoints,
      pointCategory,
    };
  });

  res.json({
    activeRound,
    matches: list,
    isLocked: lockStatus.locked,
    lockReason: lockStatus.reason,
    lockDate: db.CONFIG.find((c) => c.Variable === "FechaBloqueoRonda")?.Valor,
  });
});

// SUBMIT predictions for the current round
app.post("/api/predictions/submit", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { predictions } = req.body; // array of { matchId, golesA, golesB }

  if (!userId) {
    return res.status(401).json({ error: "Autorización requerida." });
  }

  if (!predictions || !Array.isArray(predictions)) {
    return res.status(400).json({ error: "Listado de pronósticos inválido." });
  }

  const db = readDB();
  const activeRound = db.CONFIG.find((c) => c.Variable === "RondaActual")?.Valor || "Fase de Grupos";

  // Check if round is locked
  const lockStatus = isRoundLocked(activeRound);
  if (lockStatus.locked) {
    return res.status(400).json({ error: `La ronda está bloqueada: ${lockStatus.reason}` });
  }

  // Check if user has already submitted forecasts in this round to prevent overrides
  const matchesInRound = db.PARTIDOS.filter((p) => p.Ronda === activeRound).map((p) => p.MatchID);
  const alreadySubmitted = db.PRONOSTICOS.some(
    (pr) => pr.UsuarioID === userId && matchesInRound.includes(pr.MatchID)
  );

  if (alreadySubmitted) {
    return res.status(400).json({ error: "Ya has enviado tus pronósticos para esta ronda. No se pueden modificar." });
  }

  // Filter to save predictions only for matches belonging to the active round
  const nowStr = new Date().toISOString();
  predictions.forEach((p) => {
    if (matchesInRound.includes(p.matchId) && typeof p.golesA === "number" && typeof p.golesB === "number") {
      db.PRONOSTICOS.push({
        UsuarioID: userId,
        MatchID: p.matchId,
        PronosticoA: p.golesA,
        PronosticoB: p.golesB,
        FechaEnvio: nowStr,
      });
    }
  });

  writeDBNoSync(db);
  try {
    console.log(`[Predictions-Submit] Sincronizando pronósticos de manera síncrona en Google Sheets para el usuario: ${userId}`);
    await triggerGoogleSheetsSync(db);
    console.log(`[Predictions-Submit] Sincronización síncrona exitosa.`);
  } catch (syncErr: any) {
    console.error(`[Predictions-Submit] Error en la sincronización síncrona con Google Sheets:`, syncErr?.message || syncErr);
  }

  res.json({ success: true, message: "Pronósticos cargados exitosamente de manera definitiva." });
});

// GET special predictions for a user
app.get("/api/specials", async (req, res) => {
  try {
    await maybeSyncWithSheets();
  } catch (err: any) {
    console.error("[Specials] Error en sincronización con Google Sheets:", err.message || err);
  }
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Autorización requerida." });
  }

  const db = readDB();
  const spec = db.PRONOSTICOS_ESPECIALES?.find((s) => s.UsuarioID === userId) || null;

  // Check locking state of the specials predictions
  const lockStatus = isSpecialsLocked();
  const clasificadosLock = isClasificadosLocked();

  // Calculate qualified teams from Round of 32 (16avos de Final) to return to frontend
  const qualifiedTeams = new Set<string>();
  db.PARTIDOS.forEach((p) => {
    if (p.Ronda === "16avos de Final") {
      if (p.EquipoA && !isPlaceholder(p.EquipoA)) {
        qualifiedTeams.add(p.EquipoA.trim());
      }
      if (p.EquipoB && !isPlaceholder(p.EquipoB)) {
        qualifiedTeams.add(p.EquipoB.trim());
      }
    }
  });

  // Grab the official values configuration
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));

  res.json({
    specials: spec,
    isLocked: lockStatus.locked,
    lockReason: lockStatus.reason,
    isClasificadosLocked: clasificadosLock.locked,
    clasificadosLockReason: clasificadosLock.reason,
    qualifiedTeamsList: Array.from(qualifiedTeams),
    config: {
      ResultadoCampeon: configMap.get("ResultadoCampeon") || "",
      ResultadoSubcampeon: configMap.get("ResultadoSubcampeon") || "",
      ResultadoGoleador: configMap.get("ResultadoGoleador") || "",
      ResultadoMejorJugador: configMap.get("ResultadoMejorJugador") || "",
      ResultadoMejorArquero: configMap.get("ResultadoMejorArquero") || "",
      GoogleSheetID: configMap.get("GoogleSheetID") || "",
    }
  });
});

// SUBMIT specials predictions
app.post("/api/specials/submit", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { campeon, subcampeon, goleador, mejorJugador, mejorArquero } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Autorización requerida." });
  }

  const lockStatus = isSpecialsLocked();
  if (lockStatus.locked) {
    return res.status(400).json({ error: `Las ternas están bloqueadas: ${lockStatus.reason}` });
  }

  const db = readDB();
  
  if (!db.PRONOSTICOS_ESPECIALES) {
    db.PRONOSTICOS_ESPECIALES = [];
  }

  const idx = db.PRONOSTICOS_ESPECIALES.findIndex((s) => s.UsuarioID === userId);
  const nowStr = new Date().toISOString();

  const valCampeon = (campeon || "").trim();
  const valSubcampeon = (subcampeon || "").trim();
  const valGoleador = (goleador || "").trim();
  const valMejorJugador = (mejorJugador || "").trim();
  const valMejorArquero = (mejorArquero || "").trim();

  const newRow = {
    UsuarioID: userId,
    Campeon: valCampeon,
    Subcampeon: valSubcampeon,
    Goleador: valGoleador,
    MejorJugador: valMejorJugador,
    MejorArquero: valMejorArquero,
    FechaEnvio: nowStr,
  };

  if (idx !== -1) {
    db.PRONOSTICOS_ESPECIALES[idx] = newRow;
  } else {
    db.PRONOSTICOS_ESPECIALES.push(newRow);
  }

  writeDBNoSync(db);
  computeRankingsNoSync();

  const finalDb = readDB();
  try {
    console.log(`[Specials-Submit] Sincronizando terna de especiales de manera síncrona en Google Sheets para: ${userId}`);
    await triggerGoogleSheetsSync(finalDb);
    console.log(`[Specials-Submit] Sincronización síncrona exitosa.`);
  } catch (syncErr: any) {
    console.error(`[Specials-Submit] Error en la sincronización síncrona con Google Sheets:`, syncErr?.message || syncErr);
  }

  res.json({ success: true, message: "Especiales guardados con éxito." });
});

// SUBMIT group stage qualifiers predictions (32 teams)
app.post("/api/specials/submit-clasificados", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { clasificados } = req.body; // Array of strings (team names)

  if (!userId) {
    return res.status(401).json({ error: "Autorización requerida." });
  }

  const lockStatus = isClasificadosLocked();
  if (lockStatus.locked) {
    return res.status(400).json({ error: `La selección de clasificados está bloqueada: ${lockStatus.reason}` });
  }

  if (!clasificados || !Array.isArray(clasificados) || clasificados.length !== 32) {
    return res.status(400).json({ error: "Debes seleccionar exactamente 32 selecciones clasificadas." });
  }

  const db = readDB();
  
  if (!db.PRONOSTICOS_ESPECIALES) {
    db.PRONOSTICOS_ESPECIALES = [];
  }

  const idx = db.PRONOSTICOS_ESPECIALES.findIndex((s) => s.UsuarioID === userId);
  const nowStr = new Date().toISOString();
  const serializedClasificados = clasificados.join(",");

  if (idx !== -1) {
    db.PRONOSTICOS_ESPECIALES[idx].Clasificados = serializedClasificados;
    db.PRONOSTICOS_ESPECIALES[idx].FechaEnvio = nowStr;
  } else {
    db.PRONOSTICOS_ESPECIALES.push({
      UsuarioID: userId,
      Campeon: "",
      Subcampeon: "",
      Goleador: "",
      MejorJugador: "",
      MejorArquero: "",
      Clasificados: serializedClasificados,
      FechaEnvio: nowStr,
    });
  }

  writeDBNoSync(db);
  computeRankingsNoSync();

  const finalDb = readDB();
  try {
    console.log(`[Clasificados-Submit] Sincronizando clasificados de manera síncrona en Google Sheets para: ${userId}`);
    await triggerGoogleSheetsSync(finalDb);
    console.log(`[Clasificados-Submit] Sincronización síncrona exitosa.`);
  } catch (syncErr: any) {
    console.error(`[Clasificados-Submit] Error en la sincronización síncrona con Google Sheets:`, syncErr?.message || syncErr);
  }

  res.json({ success: true, message: "Selección de 32 clasificados guardada con éxito." });
});

// GET RANKING list
app.get("/api/ranking", async (req, res) => {
  try {
    await maybeSyncWithSheets();
  } catch (err: any) {
    console.error("[Ranking] Error en sincronización con Google Sheets:", err.message || err);
  }
  const db = readDB();
  res.json({ ranking: db.RANKING });
});

// GET user stats / profile
app.get("/api/profile/:id", async (req, res) => {
  try {
    await maybeSyncWithSheets();
  } catch (err: any) {
    console.error("[Profile] Error en sincronización con Google Sheets:", err.message || err);
  }
  const userId = req.params.id;
  const db = readDB();

  const user = db.USUARIOS.find((u) => u.ID === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  const rankingRow = db.RANKING.find((r) => r.UsuarioID === userId) || {
    Puntos: 0,
    Posicion: db.RANKING.length + 1,
    AciertosExactos: 0,
    AciertosGanador: 0,
  };

  // Get predicting history
  const activeRound = db.CONFIG.find((c) => c.Variable === "RondaActual")?.Valor || "Fase de Grupos";
  const userForecasts = db.PRONOSTICOS.filter((p) => p.UsuarioID === userId);
  const matchCache = new Map<string, PartidoRow>();
  db.PARTIDOS.forEach((m) => matchCache.set(m.MatchID, m));
  const resultsCache = new Map<string, ResultadoRow>();
  db.RESULTADOS.forEach((r) => resultsCache.set(r.MatchID, r));

  const history = userForecasts.map((f) => {
    const match = matchCache.get(f.MatchID);
    const result = resultsCache.get(f.MatchID);

    let puntosObtenidos = 0;
    let tipoAcierto = "Pendiente";

    if (result && result.GolesA !== null && result.GolesB !== null && match) {
      const scoring = calculateScore(f.PronosticoA, f.PronosticoB, result.GolesA, result.GolesB, match.Ronda);
      puntosObtenidos = scoring.puntos;
      tipoAcierto = scoring.tipo;
    }

    return {
      matchId: f.MatchID,
      ronda: match ? match.Ronda : "Fase de Grupos",
      equipoA: match ? match.EquipoA : "Desconocido",
      equipoB: match ? match.EquipoB : "Desconocido",
      fechaHora: match ? match.FechaHora : "",
      pronosticoA: f.PronosticoA,
      pronosticoB: f.PronosticoB,
      realA: result ? result.GolesA : null,
      realB: result ? result.GolesB : null,
      puntos: puntosObtenidos,
      resultado: tipoAcierto,
    };
  });

  res.json({
    id: user.ID,
    nombre: user.Nombre,
    apellido: user.Apellido,
    email: user.Email,
    fechaRegistro: user.FechaRegistro,
    puntos: rankingRow.Puntos,
    posicion: rankingRow.Posicion,
    aciertosExactos: rankingRow.AciertosExactos,
    aciertosGanador: rankingRow.AciertosGanador,
    googleSheetID: db.CONFIG.find((c) => c.Variable === "GoogleSheetID")?.Valor || "",
    history,
  });
});

// ADMIN - Update Config values
app.post("/api/admin/config", (req, res) => {
  const {
    rondaActual,
    fechaInicio,
    fechaBloqueo,
    estadoSistema,
    appsScriptUrl,
    resultadoCampeon,
    resultadoSubcampeon,
    resultadoGoleador,
    resultadoMejorJugador,
    resultadoMejorArquero,
  } = req.body;
  const db = readDB();

  if (rondaActual) {
    const idx = db.CONFIG.findIndex((c) => c.Variable === "RondaActual");
    if (idx !== -1) db.CONFIG[idx].Valor = rondaActual;
  }
  if (fechaInicio) {
    const idx = db.CONFIG.findIndex((c) => c.Variable === "FechaInicioPronosticos");
    if (idx !== -1) db.CONFIG[idx].Valor = fechaInicio;
  }
  if (fechaBloqueo) {
    const idx = db.CONFIG.findIndex((c) => c.Variable === "FechaBloqueoRonda");
    if (idx !== -1) db.CONFIG[idx].Valor = fechaBloqueo;
  }
  if (estadoSistema) {
    const idx = db.CONFIG.findIndex((c) => c.Variable === "EstadoSistema");
    if (idx !== -1) db.CONFIG[idx].Valor = estadoSistema;
  }
  if (typeof appsScriptUrl === "string") {
    const idx = db.CONFIG.findIndex((c) => c.Variable === "GoogleAppsScriptUrl");
    if (idx !== -1) db.CONFIG[idx].Valor = appsScriptUrl;
  }

  const specialKeys = [
    { key: "ResultadoCampeon", val: resultadoCampeon },
    { key: "ResultadoSubcampeon", val: resultadoSubcampeon },
    { key: "ResultadoGoleador", val: resultadoGoleador },
    { key: "ResultadoMejorJugador", val: resultadoMejorJugador },
    { key: "ResultadoMejorArquero", val: resultadoMejorArquero },
  ];

  specialKeys.forEach((item) => {
    if (typeof item.val === "string") {
      const idx = db.CONFIG.findIndex((c) => c.Variable === item.key);
      if (idx !== -1) {
        db.CONFIG[idx].Valor = item.val;
      } else {
        db.CONFIG.push({ Variable: item.key, Valor: item.val });
      }
    }
  });

  writeDB(db);
  computeRankings(); // recalculate database standings according to newly configured official outcomes
  res.json({ success: true, config: db.CONFIG });
});

// ADMIN - Trigger bidirectional sync with Google Sheets (Pull merged results & Push clean recalculations)
app.post("/api/admin/sheets/sync", async (req, res) => {
  try {
    const syncResult = await syncWithGoogleSheets();
    if (syncResult.success) {
      res.json({ success: true, message: syncResult.message });
    } else {
      res.status(500).json({ error: syncResult.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: "No se pudo sincronizar por un problema del servidor: " + err.message });
  }
});

// ADMIN - Save match scores & trigger ranking computations
app.post("/api/admin/matches/scores", (req, res) => {
  const { scores } = req.body; // Array of { matchId, golesA, golesB, estado }
  if (!scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: "Formato de resultados incorrecto" });
  }

  const db = readDB();
  const nowStr = new Date().toISOString();

  scores.forEach((s) => {
    // 1. Update Match row
    const matchIdx = db.PARTIDOS.findIndex((m) => m.MatchID === s.matchId);
    if (matchIdx !== -1) {
      db.PARTIDOS[matchIdx].Estado = s.estado || "Finalizado";
    }

    // 2. Update/Save results row
    const resIdx = db.RESULTADOS.findIndex((r) => r.MatchID === s.matchId);
    let outcome = null;
    if (s.golesA !== null && s.golesB !== null) {
      outcome = s.golesA > s.golesB ? "A" : s.golesA < s.golesB ? "B" : "Empate";
    }

    if (resIdx !== -1) {
      db.RESULTADOS[resIdx].GolesA = s.golesA;
      db.RESULTADOS[resIdx].GolesB = s.golesB;
      db.RESULTADOS[resIdx].ResultadoFinal = outcome;
      db.RESULTADOS[resIdx].FechaActualizacion = nowStr;
    } else {
      db.RESULTADOS.push({
        MatchID: s.matchId,
        GolesA: s.golesA,
        GolesB: s.golesB,
        ResultadoFinal: outcome,
        FechaActualizacion: nowStr,
      });
    }
  });

  writeDB(db);
  computeRankings(); // recalculate score cards

  res.json({ success: true, message: "Resultados actualizados y ranking recalculado." });
});

// ADMIN - Clear DB to defaults
app.post("/api/admin/reset", (req, res) => {
  writeDB(DEFAULT_DB);
  computeRankings();
  res.json({ success: true, message: "Base de datos reiniciada a valores predeterminados." });
});

// ADMIN - AI Prediction / Match Sync via Gemini
// Prompts Gemini to generate/simulate realistic match results or fixture updates based on recent Copa America / World Cup expectations
app.post("/api/admin/ai-sync-predict", async (req, res) => {
  const { updateMatchups } = req.body;
  if (!ai) {
    return res.status(400).json({
      error: "Soporte de Inteligencia Artificial deshabilitado. Configure GEMINI_API_KEY.",
    });
  }

  const db = readDB();
  const activeRound = db.CONFIG.find((c) => c.Variable === "RondaActual")?.Valor || "Fase de Grupos";
  const matches = db.PARTIDOS.filter((p) => p.Ronda === activeRound);

  const prompt = `Actúa como API integradora oficial de fixtures deportivos para el Mundial FIFA 2026.
Tengo los siguientes partidos programados para la ronda "${activeRound}" actual:
${JSON.stringify(
  matches.map((m) => ({ id: m.MatchID, equipoA: m.EquipoA, equipoB: m.EquipoB }))
)}

Quiero que simules la resolución (resultados finales) de estos partidos de manera muy coherente y realista según el nivel futbolístico de cada país.
Devuelve el resultado en un JSON estricto que sea un arreglo de objetos con esta estructura de ejemplo (no agregues texto markdown, solo el JSON):
[
  { "matchId": "g_1", "golesA": 2, "golesB": 1, "estado": "Finalizado" }
]`;

  try {
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = aiResponse.text?.trim() || "";
    const responseData = JSON.parse(text);

    // Apply simulation results
    if (Array.isArray(responseData)) {
      const nowStr = new Date().toISOString();
      responseData.forEach((sim) => {
        const matchIdx = db.PARTIDOS.findIndex((m) => m.MatchID === sim.matchId);
        if (matchIdx !== -1) {
          db.PARTIDOS[matchIdx].Estado = sim.estado || "Finalizado";
        }

        const resIdx = db.RESULTADOS.findIndex((r) => r.MatchID === sim.matchId);
        let outcome = null;
        if (sim.golesA !== null && sim.golesB !== null) {
          outcome = sim.golesA > sim.golesB ? "A" : sim.golesA < sim.golesB ? "B" : "Empate";
        }

        const scoreObj = {
          MatchID: sim.matchId,
          GolesA: sim.golesA,
          GolesB: sim.golesB,
          ResultadoFinal: outcome,
          FechaActualizacion: nowStr,
        };

        if (resIdx !== -1) {
          db.RESULTADOS[resIdx] = scoreObj;
        } else {
          db.RESULTADOS.push(scoreObj);
        }
      });

      writeDB(db);
      computeRankings();

      res.json({
        success: true,
        message: "Sincronización con IA exitosa. Resultados actualizados y ranking de posiciones reordenado.",
        simulated: responseData,
      });
    } else {
      res.status(500).json({ error: "Formato de respuesta del modelo inválido.", text });
    }
  } catch (err: any) {
    console.error("AI Sync failed", err);
    res.status(500).json({ error: "No se pudo sincronizar por problemas en la API inteligente: " + err.message });
  }
});

// ADMIN - Get copyable Google Apps Script Code
app.get("/api/admin/apps-script-code", (req, res) => {
  const code = `/**
 * BACKEND GOOGLE APPS SCRIPT - PRODE MUNDIAL FIFA 2026
 * Desarrollado para integrarse directamente con el Portal Web de Colaboradores.
 * Desplegar como: "Web App" (Ejecutar como: 'Yo', Acceso: 'Cualquiera').
 */

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === "read_all") {
      return jsonResponse({
        CONFIG: readSheetData(sheet, "CONFIG"),
        USUARIOS: readSheetData(sheet, "USUARIOS"),
        PARTIDOS: readSheetData(sheet, "PARTIDOS"),
        RESULTADOS: readSheetData(sheet, "RESULTADOS"),
        PRONOSTICOS: readSheetData(sheet, "PRONOSTICOS"),
        PRONOSTICOS_ESPECIALES: readSheetData(sheet, "PRONOSTICOS_ESPECIALES"),
        RANKING: readSheetData(sheet, "RANKING")
      });
    }
    
    return jsonResponse({ success: false, error: "Acción requerida o incorrecta en GET." });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "sync_database") {
      // Reemplaza por completo el estado local si se sincroniza desde el portal principal
      writeSheetData(sheet, "CONFIG", payload.CONFIG);
      writeSheetData(sheet, "USUARIOS", payload.USUARIOS);
      writeSheetData(sheet, "PARTIDOS", payload.PARTIDOS);
      writeSheetData(sheet, "RESULTADOS", payload.RESULTADOS);
      writeSheetData(sheet, "PRONOSTICOS", payload.PRONOSTICOS);
      if (payload.PRONOSTICOS_ESPECIALES) {
        writeSheetData(sheet, "PRONOSTICOS_ESPECIALES", payload.PRONOSTICOS_ESPECIALES);
      }
      writeSheetData(sheet, "RANKING", payload.RANKING);
      
      return jsonResponse({ success: true, message: "Tablas de Google Sheets actualizadas correctamente" });
    }

    if (action === "add_user") {
      var userObj = payload.user;
      appendRowToSheet(sheet, "USUARIOS", [
        userObj.ID,
        userObj.Nombre,
        userObj.Apellido,
        userObj.Email,
        userObj.Password,
        userObj.FechaRegistro,
        userObj.Estado
      ]);
      return jsonResponse({ success: true });
    }

    if (action === "add_predictions") {
      var list = payload.predictions; // array matching rows
      var s = sheet.getSheetByName("PRONOSTICOS");
      for (var i = 0; i < list.length; i++) {
        s.appendRow([
          list[i].UsuarioID,
          list[i].MatchID,
          list[i].PronosticoA,
          list[i].PronosticoB,
          list[i].FechaEnvio
        ]);
      }
      return jsonResponse({ success: true, message: "Pronósticos insertados en Google Sheets" });
    }

    return jsonResponse({ success: false, error: "Acción desconocida en POST." });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// Helpers
function readSheetData(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    // Inicializar hoja si no existe
    sheet = spreadsheet.insertSheet(sheetName);
    initializeHeaders(sheet, sheetName);
  }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = data[r][c];
    }
    rows.push(obj);
  }
  return rows;
}

function writeSheetData(spreadsheet, sheetName, rowsList) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  sheet.clear();
  
  if (!rowsList || rowsList.length === 0) {
    initializeHeaders(sheet, sheetName);
    return;
  }
  
  var headers = Object.keys(rowsList[0]);
  sheet.appendRow(headers);
  
  var matrix = [];
  for (var i = 0; i < rowsList.length; i++) {
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      row.push(rowsList[i][headers[h]]);
    }
    matrix.push(row);
  }
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

function appendRowToSheet(spreadsheet, sheetName, rowCells) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    initializeHeaders(sheet, sheetName);
  }
  sheet.appendRow(rowCells);
}

function initializeHeaders(sheet, sheetName) {
  var headers = [];
  if (sheetName === "CONFIG") headers = ["Variable", "Valor"];
  else if (sheetName === "USUARIOS") headers = ["ID", "Nombre", "Apellido", "Email", "Password", "FechaRegistro", "Estado"];
  else if (sheetName === "PARTIDOS") headers = ["MatchID", "Ronda", "EquipoA", "EquipoB", "FechaHora", "Estadio", "Estado"];
  else if (sheetName === "RESULTADOS") headers = ["MatchID", "GolesA", "GolesB", "ResultadoFinal", "FechaActualizacion"];
  else if (sheetName === "PRONOSTICOS") headers = ["UsuarioID", "MatchID", "PronosticoA", "PronosticoB", "FechaEnvio"];
  else if (sheetName === "PRONOSTICOS_ESPECIALES") headers = ["UsuarioID", "Campeon", "Subcampeon", "Goleador", "MejorJugador", "MejorArquero", "FechaEnvio"];
  else if (sheetName === "RANKING") headers = ["UsuarioID", "NombreCompleto", "Puntos", "Posicion", "AciertosExactos", "AciertosGanador"];
  
  if (headers.length > 0) {
    sheet.appendRow(headers);
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
  res.json({ code });
});

let lastAutoSyncTime = 0;
let isSyncingBackground = false;

async function runBackgroundAutoSync() {
  const now = Date.now();
  if (isSyncingBackground) {
    console.log("[Auto-Sync-Daemon] Sincronización ya se encuentra ejecutándose en segundo plano.");
    return;
  }
  if (now - lastAutoSyncTime < 5 * 60 * 1000) {
    console.log("[Auto-Sync-Daemon] Omitiendo sincronización, se realizó hace menos de 5 minutos.");
    return;
  }

  isSyncingBackground = true;
  lastAutoSyncTime = now;

  console.log("[Auto-Sync-Daemon] Iniciando sincronización periódica de resultados de partidos...");
  try {
    const db = readDB();
    const provider = db.CONFIG.find((c: any) => c.Variable === "FootballApiProvider")?.Valor || "football-data";
    const apiKey = db.CONFIG.find((c: any) => c.Variable === "FootballApiKey")?.Valor || "a727a7bca89e4f62a7c5472e1292b2e6";
    const leagueId = db.CONFIG.find((c: any) => c.Variable === "FootballLeagueID")?.Valor || "WC";
    const season = db.CONFIG.find((c: any) => c.Variable === "FootballSeason")?.Valor || "2026";

    console.log(`[Auto-Sync-Daemon] Sincronizando con Proveedor: ${provider}, Liga: ${leagueId}, Temporada: ${season}`);
    const summary = await executeFootballApiSync({
      provider,
      apiKey,
      leagueId,
      season,
      autoDetectRounds: true,
      syncScoresOnly: false
    });
    console.log(`[Auto-Sync-Daemon] Sincronización realizada correctamente: ${JSON.stringify(summary)}`);
  } catch (err: any) {
    const errorStr = String(err?.message || err || "");
    if (errorStr.includes("fetch failed") || errorStr.includes("ENOTFOUND") || errorStr.includes("EAI_AGAIN")) {
      console.log("[Auto-Sync-Daemon] El proveedor externo de fútbol o la conexión a internet está desconectada temporalmente (Omitido de forma segura).");
    } else {
      console.log(`[Auto-Sync-Daemon] Sincronización omitida: ${errorStr}`);
    }
  } finally {
    isSyncingBackground = false;
  }
}

async function syncWithGoogleSheets(): Promise<{ success: boolean; message: string }> {
  const db = readDB();
  const configMap = new Map<string, string>();
  db.CONFIG.forEach((c) => configMap.set(c.Variable, c.Valor));
  const url = configMap.get("GoogleAppsScriptUrl");

  if (!url || typeof url !== "string" || url.trim() === "" || url.includes("PLACEHOLDER") || url.trim().length < 10) {
    return { success: false, message: "No se encuentra configurada una URL válida de Google Apps Script." };
  }

  try {
    const targetUrl = `${url.trim()}?action=read_all`;
    console.log(`[Google-Sheets-Sync] Intentando leer de Google Sheets en: ${targetUrl}`);
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Código de respuesta HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      throw new Error("Respuesta de Google Sheets vacía o formato inválido.");
    }

    console.log("[Google-Sheets-Sync] Datos leídos correctamente. Iniciando combinación...");

    // 1. Merge CONFIG
    if (Array.isArray(payload.CONFIG)) {
      payload.CONFIG.forEach((sc: any) => {
        if (sc.Variable) {
          const idx = db.CONFIG.findIndex((c) => c.Variable === sc.Variable);
          if (idx === -1) {
            db.CONFIG.push({ Variable: sc.Variable, Valor: sc.Valor || "" });
          } else {
            // Keep local GoogleAppsScriptUrl if the sheet version is blank/placeholder
            if (sc.Variable === "GoogleAppsScriptUrl" && (!sc.Valor || sc.Valor.includes("PLACEHOLDER"))) {
              // skip updating
            } else {
              db.CONFIG[idx].Valor = sc.Valor || "";
            }
          }
        }
      });
    }

    // 2. Merge USUARIOS
    if (Array.isArray(payload.USUARIOS)) {
      payload.USUARIOS.forEach((su: any) => {
        if (su.ID && su.Email) {
          const emailLower = su.Email.toLowerCase().trim();
          const idx = db.USUARIOS.findIndex(
            (u) => u.ID === su.ID || u.Email.toLowerCase().trim() === emailLower
          );
          if (idx === -1) {
            db.USUARIOS.push({
              ID: su.ID,
              Nombre: su.Nombre || "",
              Apellido: su.Apellido || "",
              Email: emailLower,
              Password: su.Password || "123456",
              FechaRegistro: su.FechaRegistro || new Date().toISOString(),
              Estado: su.Estado || "Activo"
            });
          } else {
            // Merge fields
            db.USUARIOS[idx].Nombre = su.Nombre || db.USUARIOS[idx].Nombre;
            db.USUARIOS[idx].Apellido = su.Apellido || db.USUARIOS[idx].Apellido;
            db.USUARIOS[idx].Password = su.Password || db.USUARIOS[idx].Password;
            db.USUARIOS[idx].Estado = su.Estado || db.USUARIOS[idx].Estado;
            db.USUARIOS[idx].FechaRegistro = su.FechaRegistro || db.USUARIOS[idx].FechaRegistro;
          }
        }
      });
    }

    // 3. Merge PARTIDOS
    if (Array.isArray(payload.PARTIDOS)) {
      payload.PARTIDOS.forEach((sp: any) => {
        if (sp.MatchID) {
          const idx = db.PARTIDOS.findIndex((m) => m.MatchID === sp.MatchID);
          if (idx !== -1) {
            // update if state is different to prevent overwrite with stale data, but generally prefer newer state
            if (sp.Estado && sp.Estado !== "Pendiente") {
              db.PARTIDOS[idx].Estado = sp.Estado;
            }
            if (sp.EquipoA && !isPlaceholder(sp.EquipoA)) {
              db.PARTIDOS[idx].EquipoA = sp.EquipoA;
            }
            if (sp.EquipoB && !isPlaceholder(sp.EquipoB)) {
              db.PARTIDOS[idx].EquipoB = sp.EquipoB;
            }
          }
        }
      });
    }

    // 4. Merge RESULTADOS
    if (Array.isArray(payload.RESULTADOS)) {
      payload.RESULTADOS.forEach((sr: any) => {
        if (sr.MatchID) {
          const idx = db.RESULTADOS.findIndex((r) => r.MatchID === sr.MatchID);
          const gA = sr.GolesA !== undefined && sr.GolesA !== "" ? parseInt(sr.GolesA, 10) : null;
          const gB = sr.GolesB !== undefined && sr.GolesB !== "" ? parseInt(sr.GolesB, 10) : null;

          if (gA !== null && gB !== null && !isNaN(gA) && !isNaN(gB)) {
            const scoreObj = {
              MatchID: sr.MatchID,
              GolesA: gA,
              GolesB: gB,
              ResultadoFinal: sr.ResultadoFinal || (gA > gB ? "A" : gA < gB ? "B" : "Empate"),
              FechaActualizacion: sr.FechaActualizacion || new Date().toISOString()
            };

            if (idx === -1) {
              db.RESULTADOS.push(scoreObj);
            } else {
              db.RESULTADOS[idx] = scoreObj;
            }
          }
        }
      });
    }

    // 5. Merge PRONOSTICOS
    if (Array.isArray(payload.PRONOSTICOS)) {
      payload.PRONOSTICOS.forEach((sp: any) => {
        if (sp.UsuarioID && sp.MatchID) {
          const idx = db.PRONOSTICOS.findIndex(
            (p) => p.UsuarioID === sp.UsuarioID && p.MatchID === sp.MatchID
          );
          const pA = sp.PronosticoA !== undefined && sp.PronosticoA !== "" ? parseInt(sp.PronosticoA, 10) : null;
          const pB = sp.PronosticoB !== undefined && sp.PronosticoB !== "" ? parseInt(sp.PronosticoB, 10) : null;

          if (pA !== null && pB !== null && !isNaN(pA) && !isNaN(pB)) {
            if (idx === -1) {
              db.PRONOSTICOS.push({
                UsuarioID: sp.UsuarioID,
                MatchID: sp.MatchID,
                PronosticoA: pA,
                PronosticoB: pB,
                FechaEnvio: sp.FechaEnvio || new Date().toISOString()
              });
            } else {
              // Compare Dates if both exist to see who has the newest edit
              const localDate = new Date(db.PRONOSTICOS[idx].FechaEnvio || 0);
              const sheetDate = new Date(sp.FechaEnvio || 0);
              if (sheetDate > localDate || (db.PRONOSTICOS[idx].PronosticoA !== pA || db.PRONOSTICOS[idx].PronosticoB !== pB)) {
                db.PRONOSTICOS[idx].PronosticoA = pA;
                db.PRONOSTICOS[idx].PronosticoB = pB;
                db.PRONOSTICOS[idx].FechaEnvio = sp.FechaEnvio || db.PRONOSTICOS[idx].FechaEnvio;
              }
            }
          }
        }
      });
    }

    // 6. Merge PRONOSTICOS_ESPECIALES
    if (Array.isArray(payload.PRONOSTICOS_ESPECIALES)) {
      if (!db.PRONOSTICOS_ESPECIALES) {
        db.PRONOSTICOS_ESPECIALES = [];
      }
      payload.PRONOSTICOS_ESPECIALES.forEach((se: any) => {
        if (se.UsuarioID) {
          const idx = db.PRONOSTICOS_ESPECIALES.findIndex((e) => e.UsuarioID === se.UsuarioID);
          if (idx === -1) {
            db.PRONOSTICOS_ESPECIALES.push({
              UsuarioID: se.UsuarioID,
              Campeon: se.Campeon || "",
              Subcampeon: se.Subcampeon || "",
              Goleador: se.Goleador || "",
              MejorJugador: se.MejorJugador || "",
              MejorArquero: se.MejorArquero || "",
              Clasificados: se.Clasificados || "",
              FechaEnvio: se.FechaEnvio || new Date().toISOString()
            });
          } else {
            db.PRONOSTICOS_ESPECIALES[idx].Campeon = se.Campeon || db.PRONOSTICOS_ESPECIALES[idx].Campeon;
            db.PRONOSTICOS_ESPECIALES[idx].Subcampeon = se.Subcampeon || db.PRONOSTICOS_ESPECIALES[idx].Subcampeon;
            db.PRONOSTICOS_ESPECIALES[idx].Goleador = se.Goleador || db.PRONOSTICOS_ESPECIALES[idx].Goleador;
            db.PRONOSTICOS_ESPECIALES[idx].MejorJugador = se.MejorJugador || db.PRONOSTICOS_ESPECIALES[idx].MejorJugador;
            db.PRONOSTICOS_ESPECIALES[idx].MejorArquero = se.MejorArquero || db.PRONOSTICOS_ESPECIALES[idx].MejorArquero;
            db.PRONOSTICOS_ESPECIALES[idx].Clasificados = se.Clasificados || db.PRONOSTICOS_ESPECIALES[idx].Clasificados;
            db.PRONOSTICOS_ESPECIALES[idx].FechaEnvio = se.FechaEnvio || db.PRONOSTICOS_ESPECIALES[idx].FechaEnvio;
          }
        }
      });
    }

    // Write merged database
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

    // Recalculate rankings based on the combined dataset
    computeRankings();

    // Re-read DB (since computeRankings does its own writeDB)
    const finalizedDb = readDB();

    // Push the clean, unified, merged dataset back to Google Sheets to make sure both ends are identical
    await triggerGoogleSheetsSync(finalizedDb);

    console.log("[Google-Sheets-Sync] ¡Sincronización bidireccional exitosa!");
    return { success: true, message: "Sincronización bidireccional con Google Sheets realizada correctamente. Los datos de ambos lados han sido combinados, recalculados y actualizados." };
  } catch (err: any) {
    console.error("[Google-Sheets-Sync] Error en sincronización:", err);
    return { success: false, message: `Error contactando Google Sheets: ${err.message || err}` };
  }
}

// Fronted static handling and/or Vite middleware inclusion
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PRODE FIFA 2026] Server running at http://localhost:${PORT}`);
    
    // Run database auto-migration on boot
    try {
      console.log("Evaluating stadium migration on boot...");
      readDB();
      console.log("Stadium migration check complete.");
    } catch (e) {
      console.error("Failed to run startup database migration:", e);
    }

    // Attempt bidirectional sync from Google Sheets on boot, then run standard background API update
    setTimeout(() => {
      console.log("[Boot] Realizando sincronización inicial bidireccional con Google Sheets...");
      syncWithGoogleSheets()
        .then((res) => {
          console.log(`[Boot] Sincronización inicial completada: ${res.message}`);
        })
        .catch((err) => {
          console.error("[Boot] Sincronización inicial con Google Sheets fallida:", err);
        })
        .finally(() => {
          runBackgroundAutoSync();
        });
    }, 5000);

    // Setup periodic automatic sincronization every 15 minutes (900000 ms)
    setInterval(() => {
      runBackgroundAutoSync();
    }, 15 * 60 * 1000);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
