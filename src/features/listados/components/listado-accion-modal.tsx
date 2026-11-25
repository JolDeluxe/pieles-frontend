import { useState, useEffect, type ReactNode } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { ListadoItem, TipoFrenteMaterial } from '../types/listados.types';

export type AccionOperativaAlmacen = 'separar' | 'entregar' | 'descontar';

export interface ListadoAccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listado: ListadoItem | null;
  tipoFrente?: TipoFrenteMaterial;
  accion: AccionOperativaAlmacen;
  onConfirm: (opts: { entregarTambien?: boolean }) => Promise<void> | void;
  isSubmitting?: boolean;
}

/**
 * Modal de confirmación para acciones operativas de Almacén y Auditoría:
 * 1. SEPARAR FRENTE: Pregunta confirmación e incluye checkbox opcional (default false)
 *    para marcar también como entregado a producción inmediatamente.
 * 2. ENTREGAR FRENTE: Pregunta confirmación para la entrega final del frente (sin checkbox).
 * 3. DESCONTAR FRENTE: Pregunta confirmación para descontar en sistema/ERP con acento morado.
 */
export function ListadoAccionModal({
  isOpen,
  onClose,
  listado,
  tipoFrente,
  accion,
  onConfirm,
  isSubmitting = false,
}: ListadoAccionModalProps): ReactNode {
  const [entregarTambien, setEntregarTambien] = useState<boolean>(false);

  // Reiniciar checkbox cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setEntregarTambien(false);
    }
  }, [isOpen, accion, tipoFrente, listado?.id]);

  if (!listado) return null;

  const isSeparar = accion === 'separar';
  const isDescontar = accion === 'descontar';

  const handleConfirm = () => {
    onConfirm({ entregarTambien: isSeparar ? entregarTambien : false });
  };

  const modalTitle = isSeparar
    ? 'Confirmar Separación'
    : isDescontar
    ? 'Confirmar Descuento en Sistema'
    : 'Confirmar Entrega';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalHeader
        title={modalTitle}
        onClose={onClose}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ModalBody className="space-y-4">
          {/* Card de información del programa y frente */}
          <div className="p-3.5 rounded-xl bg-cuadra-arena/30 border border-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs uppercase tracking-wider text-text-muted font-bold">
                Programa de Producción
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full bg-cuadra-arena text-text-primary border border-border/60">
                <Icon name="tag" size="12px" />
                {listado.lineaProduccion.nombre.toUpperCase()}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono font-black text-base text-text-primary tracking-wide">
                {listado.numeroListado}
              </span>
            </div>
          </div>

          {/* Pregunta explicativa */}
          {isSeparar ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-text-primary">
                <Icon name="check" size="sm" weight={800} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">¿Registrar Entrega Afectada?</p>
                  <p className="text-text-secondary text-2xs mt-0.5">
                    Se marcará la <strong>salida y entrega a producción</strong> (Palomita Roja) indicando que el material del programa ya fue entregado a producción.
                  </p>
                </div>
              </div>
            </div>
          ) : isDescontar ? (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-xs text-text-primary">
              <Icon name="done_all" size="sm" weight={800} className="text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-300">¿Marcar Descontado de Sistema?</p>
                <p className="text-text-secondary text-2xs mt-0.5">
                  Confirmas que el programa ya fue descontado en el sistema (Dos palomitas moradas) y se retirará del tablero de pendientes.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-text-primary">
              <Icon name="check" size="sm" weight={800} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">¿Registrar Regreso de Material?</p>
                <p className="text-text-secondary text-2xs mt-0.5">
                  Confirmas que producción terminó de usar el material y almacén lo recibe (Palomita Verde).
                </p>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          {isDescontar ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 min-w-[120px] justify-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="xs" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Icon name="done_all" size="xs" />
                  <span>Confirmar Descuento</span>
                </>
              )}
            </button>
          ) : (
            <Button
              type="button"
              variant={isSeparar ? 'primary' : 'success'}
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 min-w-[120px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="xs" />
                  <span>Procesando...</span>
                </>
              ) : isSeparar ? (
                entregarTambien ? (
                  <>
                    <Icon name="done_all" size="xs" />
                    <span>Separar y Entregar</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size="xs" />
                    <span>Confirmar Separación</span>
                  </>
                )
              ) : (
                <>
                  <Icon name="local_shipping" size="xs" />
                  <span>Confirmar Entrega</span>
                </>
              )}
            </Button>
          )}
        </ModalFooter>
      </div>
    </Modal>
  );
}
