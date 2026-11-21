import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQuotationPayment,
  getCustomerPortfolio,
  getPortfolio,
  voidQuotationPayment,
  type CreatePaymentInput,
  type PortfolioQuery,
  type PortfolioRange,
} from '../services/portfolio';

export function usePortfolio(query: PortfolioQuery) {
  return useQuery({
    queryKey: ['portfolio', 'summary', query],
    queryFn: () => getPortfolio(query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerPortfolio(identification: string | undefined, range: PortfolioRange) {
  return useQuery({
    queryKey: ['portfolio', 'customer', identification, range],
    queryFn: () => getCustomerPortfolio(identification!, range),
    enabled: !!identification,
    placeholderData: keepPreviousData,
  });
}

/**
 * An abono changes the cartera and the quotation's paid amount; the last
 * one completes the quotation, which also changes the caja/dashboard
 * "adeudado" (an abono itself never touches the caja).
 */
function useInvalidateAfterPayment() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    void queryClient.invalidateQueries({ queryKey: ['cash-register'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateQuotationPayment() {
  const invalidate = useInvalidateAfterPayment();
  return useMutation({
    mutationFn: ({ quotationId, input }: { quotationId: string; input: CreatePaymentInput }) =>
      createQuotationPayment(quotationId, input),
    onSuccess: invalidate,
  });
}

/** Admin only. Can reopen a quotation its abonos had completed. */
export function useVoidQuotationPayment() {
  const invalidate = useInvalidateAfterPayment();
  return useMutation({
    mutationFn: (paymentId: string) => voidQuotationPayment(paymentId),
    onSuccess: invalidate,
  });
}
