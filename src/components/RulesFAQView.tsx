import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, ShieldCheck, Zap, Lock, Eye } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
  defaultOpen?: boolean;
}

function FAQItem({ question, answer, icon, defaultOpen = false }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 rounded-2xl bg-white shadow-xs p-4 sm:p-5 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-3 text-left focus:outline-none cursor-pointer group"
      >
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="text-[13px] sm:text-xs font-bold text-slate-705 tracking-tight group-hover:text-indigo-900 transition-colors">
              {question}
            </h3>
          </div>
        </div>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors pt-1">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-50 text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium space-y-2">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function RulesFAQView() {
  return (
    <div id="rules-faq-view" className="space-y-6">
      {/* Header card introducing the rules */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600">REGLAMENTO OFICIAL DE COLABORADORES</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
              Reglas del Juego & Preguntas Frecuentes
            </h2>
          </div>
        </div>
        <p className="mt-4 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
          Bienvenido al <strong>PRODE Copa Mundial FIFA 2026</strong>. Para garantizar una competencia transparente, justa y divertida entre todos los colaboradores, hemos estructurado el reglamento con ventanas de tiempo automatizadas y multiplicadores progresivos para las fases finales.
        </p>
      </div>

      {/* Grid of details & FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Preguntas Frecuentes</h3>
          
          <FAQItem
            question="¿Cuándo pueden registrarse o modificarse los pronósticos?"
            defaultOpen={true}
            icon={<BookOpen className="h-4 w-4" />}
            answer={
              <div className="space-y-2.5 text-slate-600">
                <p>
                  Los pronósticos se habilitan oficialmente a partir de la fase de eliminación directa (<strong>Dieciseisavos de final</strong>).
                </p>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] font-semibold text-slate-700 leading-snug">
                  📌 <strong>La Ventana Oficial de Carga:</strong> Se abre exactamente <strong>en el instante en que finaliza el último partido de la ronda anterior</strong>, y se cierra irrevocablemente <strong>en el segundo exacto que se inicia el primer partido de la ronda siguiente</strong>.
                </p>
                <p>
                  Durante este periodo de ventana de carga, podrás ingresar o modificar tus pálpitos. Una vez que envías y confirmas tus pronósticos, o una vez que se inicia el primer partido de la ronda respectiva, el sistema se bloquea y pasa al <strong>Modo Lectura</strong>. No se admitirán cambios ni cargas fuera de término bajo ninguna circunstancia.
                </p>
              </div>
            }
          />

          <FAQItem
            question="¿Cómo funciona el sistema de puntuación?"
            defaultOpen={false}
            icon={<ShieldCheck className="h-4 w-4" />}
            answer={
              <div className="space-y-3 text-slate-600">
                <p>Para cada partido de eliminación directa que pronostiques, tu resultado se comparará con el marcador real finalizado. Se te asignarán puntos de la siguiente manera antes de aplicar multiplicadores:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] mb-1">
                      <span>🎯</span>
                      <span>Acierto Exacto (+5 Puntos)</span>
                    </div>
                    <p className="text-[10px] text-emerald-700/90 leading-tight">
                      Le pegaste al marcador matemático exacto de ambos equipos. (Ej. pronosticaste 2-1 y terminó 2-1).
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50/75 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-800 text-[11px] mb-1">
                      <span>⚖️</span>
                      <span>Diferencia de Goles (+4 Puntos)</span>
                    </div>
                    <p className="text-[10px] text-indigo-700/90 leading-tight">
                      Acertaste el ganador y la diferencia exacta de goles, pero no el resultado exacto. (Ej. pronosticaste 3-1 y terminó 2-0).
                    </p>
                  </div>

                  <div className="p-3 bg-sky-55 gap-1.5 border border-sky-100 rounded-xl sm:col-span-2">
                    <div className="flex items-center gap-1.5 font-bold text-sky-800 text-[11px] mb-1">
                      <span>🏆</span>
                      <span>Ganador o Empate Correcto (+3 Puntos)</span>
                    </div>
                    <p className="text-[10px] text-sky-700/90 leading-tight">
                      Acertaste el ganador o el empate, sin coincidir en diferencias ni resultado exacto. (Ej. pronosticaste 2-0 y terminó 3-1; o pronosticaste 1-1 y terminó 2-2).
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-450 italic pt-1">
                  Nota: Si no aciertas ni el ganador, ni el resultado exacto, obtendrás 0 puntos. Los goles se consideran para el resultado hasta el tiempo reglamentario completo (incluyendo el tiempo extra si correspondiera, excluyendo la tanda de penales si el torneo define ahí).
                </p>
              </div>
            }
          />

          <FAQItem
            question="¿Qué son los Multiplicadores de Fase Final?"
            defaultOpen={false}
            icon={<Zap className="h-4 w-4" />}
            answer={
              <div className="space-y-2.5 text-slate-600">
                <p>
                  A medida que la Copa Mundial FIFA 2026 avanza, la tensión y la importancia de los partidos aumentan. Por ello, el PRODE premia tu audacia con multiplicadores en el puntaje de cada fase:
                </p>
                <div className="overflow-hidden border border-slate-150 rounded-xl">
                  <table className="w-full text-[11px] text-slate-700 font-semibold text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-450 tracking-wider">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-100">Fase del Torneo</th>
                        <th className="px-3 py-2 border-b border-slate-100 text-center">Multiplicador</th>
                        <th className="px-3 py-2 border-b border-slate-100 text-right">Pts Exacto / Dif / Ganador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-3 py-2 text-slate-500">16avos de Final</td>
                        <td className="px-3 py-2 text-center text-slate-900 font-bold">x1</td>
                        <td className="px-3 py-2 text-right text-slate-700">5 Pts / 4 Pts / 3 Pts</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500">Octavos de Final</td>
                        <td className="px-3 py-2 text-center text-indigo-600 font-bold">x1.5</td>
                        <td className="px-3 py-2 text-right text-indigo-600">7.5 Pts / 6 Pts / 4.5 Pts</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500">Cuartos de Final</td>
                        <td className="px-3 py-2 text-center text-indigo-600 font-bold">x2</td>
                        <td className="px-3 py-2 text-right text-indigo-600">10 Pts / 8 Pts / 6 Pts</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500">Semifinales y 3er Puesto</td>
                        <td className="px-3 py-2 text-center text-purple-650 font-bold">x3</td>
                        <td className="px-3 py-2 text-right text-purple-650">15 Pts / 12 Pts / 9 Pts</td>
                      </tr>
                      <tr className="bg-amber-50/20">
                        <td className="px-3 py-2 text-slate-800 font-bold">Gran Final</td>
                        <td className="px-3 py-2 text-center text-amber-700 font-bold">x5🌟</td>
                        <td className="px-3 py-2 text-right text-amber-700">25 Pts / 20 Pts / 15 Pts</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            }
          />

          <FAQItem
            question="¿Cómo funcionan los pronósticos de Especiales?"
            defaultOpen={false}
            icon={<HelpCircle className="h-4 w-4" />}
            answer={
              <div className="space-y-2 text-slate-600">
                <p>
                  Las "Ternas Especiales" corresponden a predicciones generales a largo plazo del campeonato (por ejemplo, definir el Campeón Mundial, Subcampeón, Tercer Puesto, Cuarto Puesto, Goleador, Mejor Jugador y Mejor Arquero).
                </p>
                <p>
                  <strong>⚠️ Bloqueo Absoluto:</strong> Como estas ternas dependen de todo el torneo, debes guardarlas <strong>antes de que empiece el partido inaugural del mundial</strong>. Una vez comience el campeonato, la sección se cerrará definitivamente y no se podrá editar. Cada acierto en las Especiales sumará una base de puntos adicionales sumamente valiosos al cierre del mundial.
                </p>
              </div>
            }
          />

          <FAQItem
            question="¿Cómo funciona el pronóstico de los 32 Clasificados a Dieciseisavos (16avos)?"
            defaultOpen={false}
            icon={<Zap className="h-4 w-4" />}
            answer={
              <div className="space-y-2.5 text-slate-600">
                <p>
                  Es una de las mecánicas más dinámicas y emocionantes de este PRODE. Debes seleccionar exactamente las <strong>32 selecciones nacionales</strong> que clasificarán de la Fase de Grupos hacia los Dieciseisavos de Final (los playoffs directos).
                </p>
                <p className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] font-semibold text-indigo-950 leading-snug">
                  🎯 <strong>Puntos Obtenidos:</strong> Sumas de forma incremental <strong>+2 puntos extras por cada selección acertada</strong>. Si aciertas las 32 selecciones que avanzan a la fase de eliminación directa, podés ganar un máximo absoluto de <strong>+64 puntos de bonificación</strong>.
                </p>
                <p className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] font-semibold text-rose-955 leading-snug">
                  ⏰ <strong>Fecha y Hora Límite de Carga:</strong> La fecha de entrega está establecida irrevocablemente para el <strong>Miércoles 17 de Junio de 2026 a las 23:59 hs (Hora de Argentina)</strong>. Después de esa hora, la sección quedará sellada definitivamente.
                </p>
              </div>
            }
          />

          <FAQItem
            question="¿Qué significan los modos 'PRONOSTICÁ TUS RESULTADOS' y 'MODO LECTURA'?"
            defaultOpen={false}
            icon={<Eye className="h-4 w-4" />}
            answer={
              <div className="space-y-4 text-slate-600">
                <p>
                  El sistema cuenta con dos estados visuales clave que indican instantáneamente si la carga de tus vaticinios está habilitada o sellada de manera segura:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-150">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      PRONOSTICÁ TUS RESULTADOS
                    </span>
                    <p className="text-[10px] text-emerald-700 leading-normal">
                      <strong>Modo Activo (Verde):</strong> Indica que la ventana de carga está abierta para la ronda actual. Podés ingresar, borrar o actualizar tus goles con total libertad.
                    </p>
                  </div>
                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-150">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Modo Lectura
                    </span>
                    <p className="text-[10px] text-rose-700 leading-normal">
                      <strong>Modo Bloqueado (Rojo):</strong> Indica que los controles han sido inhabilitados para proteger el fair play. El PRODE actúa en este estado únicamente como visor.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-slate-705 text-[11px] mb-1.5">Los partidos pasan a Modo Lectura en las siguientes situaciones:</p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] list-outside">
                    <li><strong>Durante la Fase de Grupos:</strong> El fixture actúa como visor interactivo, ya que el pronóstico de partidos individuales corre únicamente de 16avos de final en adelante. <em>Sin embargo, podés completar tu pronóstico de las 32 selecciones clasificadas en la sección &quot;Especiales / Clasificados&quot; antes de la fecha límite.</em></li>
                    <li><strong>Fuera de la Ventana de Carga:</strong> Si el primer partido de la ronda en juego ya comenzó, el sistema bloquea automáticamente toda la jornada.</li>
                    <li><strong>Post-Confirmación:</strong> Si completaste tus goles y confirmaste tus pronósticos de la ronda para consolidarlos, tu papeleta oficial se sella en el servidor de forma irrevocable.</li>
                  </ul>
                </div>
              </div>
            }
          />
        </div>

        {/* Sidebar details */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Puntos y Multiplicadores</h3>

          {/* Rules bento card */}
          <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <span>🔑 Sistema de Puntos</span>
              <span className="animate-pulse bg-emerald-500 h-1.5 w-1.5 rounded-full inline-block"></span>
            </h2>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600 font-semibold">Resultado Exacto</span>
                <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">+5 pts</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600 font-semibold">Diferencia de Goles</span>
                <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">+4 pts</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600 font-semibold">Ganador o Empate</span>
                <span className="font-extrabold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">+3 pts</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600 font-semibold">Sin aciertos</span>
                <span className="font-semibold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">0 pts</span>
              </div>
              <div className="mt-4 pt-2">
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  * El puntaje se calcula automáticamente por cada partido y se multiplica según el factor de la ronda en juego (desde x1 hasta x5).
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pt-2 px-1">Resumen del Fair Play</h3>
          
          <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4 shadow-xs">
            <div className="text-center pb-2 border-b border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Código de Conducta</span>
              <span className="text-lg font-extrabold text-slate-850 block mt-0.5">Juego Limpio</span>
            </div>

            <div className="flex gap-2.5">
              <span className="text-sm">🤝</span>
              <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                <p className="text-slate-800 font-bold">Un solo envío por ronda</p>
                Analiza bien tus opciones antes de confirmar. Una vez enviado, el servidor archiva tu pronóstico de forma directa de manera irreversible.
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="text-sm">⏱️</span>
              <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                <p className="text-slate-800 font-bold">Carga con tiempo</p>
                No esperes al último minuto. La fecha y hora de cierre está sincronizada en milisegundos con el pitazo inicial de la FIFA administrado por la API.
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="text-sm">✨</span>
              <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                <p className="text-slate-800 font-bold">Transparencia Total</p>
                Todas las planillas se replican en el Google Sheet de administración visible para el comité a fin de auditar la consistencia matemática de los puntos de los usuarios.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
