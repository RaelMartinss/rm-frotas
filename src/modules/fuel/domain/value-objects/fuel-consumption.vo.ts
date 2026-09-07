export interface FuelConsumptionProps {
  distanceKm: number;
  litersConsumed: number;
  kmPerLiter: number;
  costPerKm?: number;
}

export class FuelConsumption {
  private readonly props: FuelConsumptionProps;

  constructor(props: FuelConsumptionProps) {
    this.props = {
      ...props,
      kmPerLiter: Math.round(props.kmPerLiter * 100) / 100,
      costPerKm: props.costPerKm !== undefined ? Math.round(props.costPerKm * 100) / 100 : undefined,
    };
  }

  public get distanceKm(): number {
    return this.props.distanceKm;
  }

  public get litersConsumed(): number {
    return this.props.litersConsumed;
  }

  public get kmPerLiter(): number {
    return this.props.kmPerLiter;
  }

  public get costPerKm(): number | undefined {
    return this.props.costPerKm;
  }

  /**
   * Calcula o consumo médio entre dois abastecimentos consecutivos com fullTank = true.
   */
  public static calculate(
    previousOdometer: number,
    currentOdometer: number,
    liters: number,
    totalCost?: number
  ): FuelConsumption | null {
    if (currentOdometer <= previousOdometer || liters <= 0) {
      return null;
    }

    const distanceKm = currentOdometer - previousOdometer;
    const kmPerLiter = distanceKm / liters;
    const costPerKm = totalCost && totalCost > 0 ? totalCost / distanceKm : undefined;

    return new FuelConsumption({
      distanceKm,
      litersConsumed: liters,
      kmPerLiter,
      costPerKm,
    });
  }
}
