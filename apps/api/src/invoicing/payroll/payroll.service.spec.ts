import { Repository } from 'typeorm';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollService } from './payroll.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let payrollRepository: {
    create: jest.Mock<Partial<PayrollEntry>, [Partial<PayrollEntry>]>;
    save: jest.Mock<Promise<PayrollEntry>, [Partial<PayrollEntry>]>;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
  };
  let dataicoClient: {
    post: jest.Mock<Promise<unknown>, [string, unknown, string?]>;
    get: jest.Mock<Promise<unknown>, [string, string?]>;
  };
  let dataicoConfig: { payrollBaseUrl: string };

  // Entirely fictitious test data — never real employee data, see
  // docs/phases/PHASE_15_PAYROLL.md's note on the shared reference
  // containing real PII that must never be reused, including in tests.
  const baseDto: CreatePayrollEntryDto = {
    prefix: 'N',
    number: 1,
    salary: 1000000,
    periodicity: 'MENSUAL',
    initialSettlementDate: '2026-08-01',
    finalSettlementDate: '2026-08-31',
    issueDate: '2026-09-07',
    paymentDate: '2026-08-31',
    accruals: [{ code: 'BASICO', amount: 1000000, days: 30 }],
    deductions: [{ code: 'SALUD', amount: 40000, percentage: 4 }],
    employee: {
      identificationType: 'CEDULA_DE_CIUDADANIA',
      identification: '000000000',
      firstName: 'TEST',
      lastName: 'EMPLOYEE',
      email: 'test@example.com',
      integralSalary: false,
      highRisk: false,
      startDate: '2026-01-01',
      workerType: 'DEPENDIENTE',
      subCode: 'NO_APLICA',
      paymentMeans: 'TRANSFERENCIA_CREDITO_BANCARIO',
      contractType: 'TERMINO_FIJO',
      address: { line: 'CL 1 # 2-3', city: '001', department: '11' },
    },
  };

  beforeEach(() => {
    payrollRepository = {
      create: jest.fn<Partial<PayrollEntry>, [Partial<PayrollEntry>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<PayrollEntry>, [Partial<PayrollEntry>]>((entity) =>
        Promise.resolve({
          ...entity,
          id: 'payroll-1',
          createdAt: new Date(),
        } as PayrollEntry),
      ),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    dataicoClient = {
      post: jest.fn<Promise<unknown>, [string, unknown, string?]>(),
      get: jest.fn<Promise<unknown>, [string, string?]>(),
    };
    dataicoConfig = {
      payrollBaseUrl: 'https://api.dataico.com/direct/payroll-api/v2',
    };

    service = new PayrollService(
      payrollRepository as unknown as Repository<PayrollEntry>,
      dataicoClient as unknown as DataicoClientService,
      dataicoConfig as unknown as DataicoConfig,
    );
  });

  describe('create', () => {
    beforeEach(() => {
      dataicoClient.post.mockResolvedValue({ dian_status: 'DIAN_ACEPTADO' });
    });

    it('sends the confirmed payload shape to the payroll base URL', async () => {
      await service.create(baseDto, 'user-1');

      expect(dataicoClient.post).toHaveBeenCalledWith(
        '/payroll-entries',
        expect.objectContaining({
          send_dian: true,
          env: 'PRODUCCION',
          prefix: 'N',
          number: 1,
          'initial-settlement-date': '01/08/2026',
          'final-settlement-date': '31/08/2026',
          'payment-date': '31/08/2026',
          accruals: [{ code: 'BASICO', amount: 1000000, days: 30 }],
          deductions: [{ code: 'SALUD', amount: 40000, percentage: 4 }],
          employee: expect.objectContaining({
            code: '000000000',
            identification: '000000000',
            'identification-type': 'CEDULA_DE_CIUDADANIA',
            'first-name': 'TEST',
            'last-name': 'EMPLOYEE',
            'integral-salary': false,
            'high-risk': false,
            'start-date': '01/01/2026',
          }) as unknown,
        }),
        'https://api.dataico.com/direct/payroll-api/v2',
      );
    });

    it('builds employeeName from the available name parts', async () => {
      await service.create(baseDto, 'user-1');

      const created = payrollRepository.create.mock.calls[0][0];
      expect(created.employeeName).toBe('TEST EMPLOYEE');
    });
  });

  describe('refreshStatus', () => {
    it('queries by prefix/number as path segments, not a query string', async () => {
      payrollRepository.findOne.mockResolvedValue({
        id: 'payroll-1',
        prefix: 'N',
        number: 1,
        createdAt: new Date(),
      });
      dataicoClient.get.mockResolvedValue({ dian_status: 'DIAN_ACEPTADO' });

      await service.refreshStatus('payroll-1');

      expect(dataicoClient.get).toHaveBeenCalledWith(
        '/payroll-entries/N/1',
        'https://api.dataico.com/direct/payroll-api/v2',
      );
    });
  });
});
