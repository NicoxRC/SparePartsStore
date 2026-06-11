import { useMutation } from '@tanstack/react-query';
import { exportArticulos } from '../services/export';

export function useExportArticulos() {
  return useMutation({ mutationFn: exportArticulos });
}
