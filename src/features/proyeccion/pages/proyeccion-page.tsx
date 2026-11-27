import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useLayoutUI } from '@/layouts/use-layout-ui';

// Listados
import { useListados } from '@/features/listados/hooks/use-listados';
import { useLineasProduccion } from '@/features/listados/hooks/use-lineas-produccion';
import { ListadosPendientesParalelaTable } from '@/features/listados/components/listados-pendientes-paralela-table';
import { clasificarListadosPorArea } from '@/features/listados/utils/classify-listados';

// Vales
import { useVales } from '@/features/vales/hooks/use-vales';
import { ValesPendientesParalelaTable } from '@/features/vales/components/vales-pendientes-paralela-table';
import { classifyVales } from '@/features/vales/utils/classify-vales';

import type { ModuloProyeccion, ProyeccionPageProps } from '../types/proyeccion.types';

/** Formato fecha seguro dd/mm/aaaa */
function formatFecha(fechaStr: string): string {
  if (!fechaStr) return '—';
  const solo = fechaStr.includes('T') ? fechaStr.slice(0, 10) : fechaStr;
  const [year, month, day] = solo.split('-');
  if (!year || !month || !day) return fechaStr;
  return `${day}/${month}/${year}`;
}

const INACTIVITY_MS = 10 * 1000; // 10 segundos configurados para pruebas de inactividad

/**
 * Pantalla Principal de PROYECCIÓN DE PLANTA.
 * Muestra los listados y vales pendientes en tiempo real sin ruido visual innecesario.
 */
export function ProyeccionPage(_props?: ProyeccionPageProps): ReactNode {
  const { hasPermission } = usePermissions();
  const { fullscreenMode, setFullscreenMode } = useLayoutUI();
  const canVerListados = hasPermission('listado:ver');
  const canVerVales = hasPermission('vale:ver');
  const canVer = canVerListados || canVerVales;

  // ─── Reloj Digital en Vivo (actualización cada segundo) ─────────────────────
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateString = currentTime.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // ─── Datos en Tiempo Real: Listados Pendientes ──────────────────────────────
  const {
    items: itemsListados,
    isLoading: isLoadingListados,
    error: errorListados,
    reloadListados,
    highlightedIds: highlightedListadosIds,
    entregandoIds: entregandoListadosIds,
    descontandoIds: descontandoListadosIds,
  } = useListados({
    fixedEstado: 'PENDIENTE,EN_PROCESO,SEPARADO,ENTREGADO_A_PRODUCCION',
    modoGlobal: true,
    customLimit: 1000,
  });

  const { todasLasLineas } = useLineasProduccion();

  const itemsListadosPendientes = useMemo(() => {
    return itemsListados.filter((item) => {
      if (descontandoListadosIds.includes(item.id) || entregandoListadosIds.includes(item.id)) {
        return true;
      }
      if ((item.estado as string) === 'CANCELADO' || (item.estado as string) === 'DESCONTADO') {
        return false;
      }
      if (item.frentes && item.frentes.length > 0) {
        return item.frentes.some((f) => f.estado !== 'DESCONTADO');
      }
      return (item.estado as string) !== 'DESCONTADO' && (item.estado as string) !== 'CANCELADO';
    });
  }, [itemsListados, descontandoListadosIds, entregandoListadosIds]);

  const {
    botaItems: listadosBota,
    accesoriosItems: listadosAccesorios,
    noClasificados: listadosNoClasificados,
  } = useMemo(() => {
    return clasificarListadosPorArea(itemsListadosPendientes, todasLasLineas);
  }, [itemsListadosPendientes, todasLasLineas]);

  // ─── Datos en Tiempo Real: Vales Pendientes ─────────────────────────────────
  const {
    items: itemsVales,
    isLoading: isLoadingVales,
    error: errorVales,
    reload: reloadVales,
    highlightedIds: highlightedValesIds,
    entregandoIds: entregandoValesIds,
    descontandoIds: descontandoValesIds,
  } = useVales({
    scopeView: 'general',
    fixedEstado: 'PENDIENTE,SEPARADO,ENTREGADO',
    customLimit: 500,
  });

  const itemsValesPendientes = useMemo(() => {
    return itemsVales.filter((item) => {
      if (descontandoValesIds.includes(item.id) || entregandoValesIds.includes(item.id)) {
        return true;
      }
      return item.estado !== 'CANCELADO' && item.estado !== 'DESCONTADO';
    });
  }, [itemsVales, descontandoValesIds, entregandoValesIds]);

  const {
    botaItems: valesBota,
    accesoriosItems: valesAccesorios,
    otroItems: valesOtro,
  } = useMemo(() => {
    return classifyVales(itemsValesPendientes);
  }, [itemsValesPendientes]);

  // ─── Control de Vistas (Listados activo en sistema de pieles) ───────────────
  const activeTab: ModuloProyeccion = 'listados';

  // ─── Modo Pantalla Completa & Detección de Inactividad ──────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Alternar pantalla completa: oculta el layout (Sidebar/Navbar) y solicita fullscreen nativo
  const toggleFullscreen = async () => {
    try {
      if (!fullscreenMode) {
        setFullscreenMode(true);
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        setFullscreenMode(false);
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Ignorar bloqueos de API de navegadores
    }
  };

  // Tecla Escape para salir de pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenMode) {
        setFullscreenMode(false);
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenMode, setFullscreenMode]);

  // Sincronizar si el usuario sale del fullscreen nativo del navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && fullscreenMode) {
        setFullscreenMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fullscreenMode, setFullscreenMode]);

  // Limpiar fullscreenMode si el usuario navega a otra pantalla
  useEffect(() => {
    return () => {
      setFullscreenMode(false);
    };
  }, [setFullscreenMode]);

  // Temporizador de inactividad de 10 segundos para pruebas
  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        // Al cumplir 10 segundos sin interacción, activar pantalla completa automáticamente
        if (!fullscreenMode) {
          setFullscreenMode(true);
          if (containerRef.current && !document.fullscreenElement) {
            void containerRef.current.requestFullscreen().catch(() => {});
          }
        }
      }, INACTIVITY_MS);
    };

    const handleUserActivity = (e: Event) => {
      if (e.type === 'mousemove') {
        const mouseEvt = e as MouseEvent;
        const dx = Math.abs(mouseEvt.clientX - lastMousePosRef.current.x);
        const dy = Math.abs(mouseEvt.clientY - lastMousePosRef.current.y);
        if (dx < 10 && dy < 10) return;
        lastMousePosRef.current = { x: mouseEvt.clientX, y: mouseEvt.clientY };
      }

      // Si ya está maximizado, no reiniciar el timer para no interferir
      if (fullscreenMode) return;
      resetTimer();
    };

    const userActivityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    userActivityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true }),
    );

    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      userActivityEvents.forEach((evt) =>
        window.removeEventListener(evt, handleUserActivity),
      );
    };
  }, [fullscreenMode, setFullscreenMode]);

  // Recarga manual global de datos
  const handleReloadData = async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.update());
      });
    }
    await Promise.allSettled([reloadListados(), reloadVales()]);
  };

  if (!canVer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-20 gap-4 text-center bg-app-surface">
        <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
          <Icon name="lock" size="lg" className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Acceso restringido</h2>
        <p className="text-sm text-text-secondary max-w-sm">
          No tienes permisos para visualizar el módulo de proyección.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full select-none space-y-3 transition-colors',
        fullscreenMode ? 'bg-app-surface' : '',
      )}
    >
      {/* ─── ENCABEZADO MULTIFUNCIÓN DE PROYECCIÓN ─── */}
      <div className="relative overflow-hidden bg-app-surface border border-border rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        {/* Barra superior de rotación (deshabilitada en sistema de pieles) */}

        {/* Lado izquierdo: Selector de módulos de Proyección (Listados / Vales con texto e icono más grande y claro) */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <div className="flex items-center gap-1.5 p-1 bg-app-surface-muted/90 rounded-xl border border-border/70">
            {canVerListados && (
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm sm:text-base font-black tracking-wide select-none bg-app-surface text-brand-primary shadow-xs border-2 border-brand-primary/40 cursor-default"
              >
                <Icon name="format_list_bulleted" size="18px" />
                <span>PROGRAMAS</span>
                <span className="px-2 py-0.5 rounded-full text-xs sm:text-sm font-mono font-bold leading-tight bg-brand-primary text-white">
                  {itemsListadosPendientes.length}
                </span>
              </div>
            )}

            {/* Vales temporalmente deshabilitados en proyección
            {canVerVales && (
              <button
                type="button"
                onClick={() => handleSelectTab('vales')}
                disabled={!hasVales}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm sm:text-base font-black tracking-wide transition-all select-none',
                  activeTab === 'vales'
                    ? 'bg-app-surface text-brand-primary shadow-xs border-2 border-brand-primary/40 cursor-default'
                    : !hasVales
                      ? 'text-text-muted/40 bg-transparent border-transparent opacity-40 cursor-default pointer-events-none'
                      : 'text-text-muted hover:text-text-primary hover:bg-app-surface/60 cursor-pointer',
                )}
              >
                <Icon name="receipt_long" size="18px" />
                <span>VALES</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs sm:text-sm font-mono font-bold leading-tight',
                    activeTab === 'vales'
                      ? 'bg-brand-primary text-white'
                      : !hasVales
                        ? 'bg-cuadra-arena/40 text-text-muted/50 border border-border/30'
                        : 'bg-cuadra-arena text-text-secondary border border-border/80',
                  )}
                >
                  {itemsValesPendientes.length}
                </span>
              </button>
            )}
            */}
          </div>

          {/* Control de Rotación Automática (comentado mientras Vales esté deshabilitado)
          {canVerListados && canVerVales && (
            <button
              type="button"
              ...
            </button>
          )}
          */}
        </div>

        {/* Lado derecho: Reloj digital discreto + Acciones de proyección */}
        <div className="flex items-center gap-3 ml-auto pt-0.5">
          {/* Reloj Digital en Vivo (tamaño limpio y discreto) */}
          <div className="flex flex-col items-end text-right leading-tight">
            <span className="text-xs sm:text-sm font-bold font-mono text-text-primary tracking-wide">
              {timeString}
            </span>
            <span className="text-[10px] text-text-muted capitalize">
              {dateString}
            </span>
          </div>

          {/* Botón de Recarga / Sincronización */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReloadData}
            className="h-8 w-8 p-0 border-border bg-app-surface hover:bg-app-surface-muted/60 text-text-primary shadow-2xs group"
            title="Sincronizar y forzar actualización"
          >
            <Icon
              name="refresh"
              size="18px"
              className="text-text-secondary group-hover:text-text-primary group-hover:rotate-180 transition-transform duration-500"
            />
          </Button>

          {/* Botón de Pantalla Completa */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className={cn(
              'h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 border-border bg-app-surface hover:bg-app-surface-muted/60 text-text-primary shadow-2xs cursor-pointer',
              fullscreenMode && 'border-brand-primary/40 text-brand-primary',
            )}
            title={
              fullscreenMode
                ? 'Salir de pantalla completa (Esc)'
                : 'Maximizar a pantalla completa para proyectar'
            }
          >
            <Icon
              name={fullscreenMode ? 'fullscreen_exit' : 'fullscreen'}
              size="16px"
              className="text-brand-primary"
            />
            <span className="hidden sm:inline">
              {fullscreenMode ? 'Salir' : 'Pantalla Completa'}
            </span>
          </Button>
        </div>
      </div>

      {/* ─── TABLERO SEGÚN PESTAÑA ACTIVA ─── */}
      <div key={activeTab} className="animate-in fade-in duration-300">
        {activeTab === 'listados' ? (
          <div className="space-y-3">
            {/* Alerta de no clasificados si correspondiera */}
            {listadosNoClasificados.length > 0 && !isLoadingListados && (
              <div className="p-2.5 bg-warning-subtle border border-warning/30 rounded-xl text-xs text-warning-text flex items-center gap-2">
                <Icon name="warning" size="xs" className="shrink-0" />
                <span>
                  {listadosNoClasificados.length} listado(s) tienen línea sin área asignada (
                  {listadosNoClasificados.map((i) => i.lineaProduccion.codigo).join(', ')}).
                </span>
              </div>
            )}

            {/* Error de conexión */}
            {errorListados && !isLoadingListados && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger font-medium flex items-center gap-2">
                <Icon name="error" size="xs" />
                {errorListados}
              </div>
            )}

            {/* Tablero Paralelo Oficial de Listados (BOTA | ACCESORIOS) */}
            <ListadosPendientesParalelaTable
              botaItems={listadosBota}
              accesoriosItems={listadosAccesorios}
              formatFecha={formatFecha}
              isLoading={isLoadingListados}
              allowSelection={false}
              hideActions={true}
              highlightedListadoId={highlightedListadosIds}
              entregandoListadoId={entregandoListadosIds}
              descontandoListadoId={descontandoListadosIds}
              emptyMessage="Todos los listados completados"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Error de conexión */}
            {errorVales && !isLoadingVales && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger font-medium flex items-center gap-2">
                <Icon name="error" size="xs" />
                {errorVales}
              </div>
            )}

            {/* Tablero Paralelo Oficial de Vales (BOTA | ACCESORIOS | OTRO) */}
            <ValesPendientesParalelaTable
              botaItems={valesBota}
              accesoriosItems={valesAccesorios}
              otroItems={valesOtro}
              formatFecha={formatFecha}
              isLoading={isLoadingVales}
              allowSelection={false}
              hideActions={true}
              highlightedValeId={highlightedValesIds}
              entregandoValeId={entregandoValesIds}
              descontandoValeId={descontandoValesIds}
              emptyMessage="Todos los vales completados"
            />
          </div>
        )}
      </div>
    </div>
  );
}
