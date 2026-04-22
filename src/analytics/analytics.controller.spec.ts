import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

type ServiceMock = {
  [K in keyof AnalyticsService]: jest.Mock;
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: ServiceMock;

  const user = { sub: 'user-123' };

  beforeEach(async () => {
    service = {
      total: jest.fn(),
      byCategory: jest.fn(),
      byMerchant: jest.fn(),
      byPaymentMethod: jest.fn(),
      timeseries: jest.fn(),
      topExpenses: jest.fn(),
      summary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates total() with user.sub and dto', async () => {
    const dto = { period: 'month' as const };
    service.total.mockResolvedValue({ total: 42 });

    const result = await controller.total(user, dto);

    expect(service.total).toHaveBeenCalledWith('user-123', dto);
    expect(result).toEqual({ total: 42 });
  });

  it('delegates byCategory()', async () => {
    const dto = { period: 'month' as const };
    service.byCategory.mockResolvedValue([]);

    await controller.byCategory(user, dto);

    expect(service.byCategory).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates byMerchant()', async () => {
    const dto = { period: 'month' as const };
    service.byMerchant.mockResolvedValue([]);

    await controller.byMerchant(user, dto);

    expect(service.byMerchant).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates byPaymentMethod()', async () => {
    const dto = { period: 'month' as const };
    service.byPaymentMethod.mockResolvedValue([]);

    await controller.byPaymentMethod(user, dto);

    expect(service.byPaymentMethod).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates timeseries()', async () => {
    const dto = { period: 'month' as const };
    service.timeseries.mockResolvedValue({
      period: 'month',
      granularity: 'day',
      buckets: [],
    });

    await controller.timeseries(user, dto);

    expect(service.timeseries).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates topExpenses()', async () => {
    const dto = { period: 'month' as const, limit: 5 };
    service.topExpenses.mockResolvedValue([]);

    await controller.topExpenses(user, dto);

    expect(service.topExpenses).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates summary()', async () => {
    const dto = { period: 'month' as const };
    service.summary.mockResolvedValue({
      total: 0,
      receipt_count: 0,
      expense_count: 0,
      avg_receipt_value: 0,
      top_categories: [],
      top_merchants: [],
    });

    await controller.summary(user, dto);

    expect(service.summary).toHaveBeenCalledWith('user-123', dto);
  });
});
