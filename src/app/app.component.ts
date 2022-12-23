import { Component, OnDestroy } from "@angular/core";
import { FormControl } from "@angular/forms";
import {
  combineLatest,
  map,
  Observable,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs";
import { Reservation, Usage, VehicleMap } from "./interfaces";
import { RestApiService } from "./services/rest-api.service";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const ONE_MIN = 60 * 1000;

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnDestroy {
  title = "parking";

  unsubscribe$ = new Subject<void>();

  currentReservations$: Subject<Reservation[]>;
  checkUsage$: Subject<Usage>;
  activeSubscriptionsMap = new Map<string, Subscription>();

  vehicleMap: VehicleMap | undefined;
  vehicleMapKeys: string[] | undefined;
  vehicleFormControl: FormControl;

  subscribeAfterUpdatingState = (obs$: Observable<unknown>): Subscription => {
    const getReservationsAndUsage$ = switchMap(() =>
      combineLatest([this.rest.getReservations(), this.rest.checkUsage()])
    );

    const updateUsageAndReservations$ = map(
      ([reservations, usage]: [reservations: Reservation[], usage: Usage]) => {
        this.currentReservations$.next(reservations);
        this.checkUsage$.next(usage);
      }
    );

    return obs$
      .pipe(
        getReservationsAndUsage$,
        updateUsageAndReservations$,
        takeUntil(this.unsubscribe$)
      )
      .subscribe({
        error: console.error,
      });
  };

  constructor(private rest: RestApiService) {
    this.vehicleFormControl = new FormControl("");
    this.currentReservations$ = new Subject<Reservation[]>();
    this.checkUsage$ = new Subject<Usage>();

    this.subscribeAfterUpdatingState(
      this.rest.getConfigs().pipe(
        tap((res) => {
          this.vehicleMap = res.vehicleMap;
          this.vehicleMapKeys = Object.keys(this.vehicleMap);
        })
      )
    );
  }

  reserve(event: SubmitEvent): void {
    event.preventDefault();

    const value = this.vehicleFormControl.value;

    if (!this.vehicleMap) {
      return;
    }

    const vehicle = this.vehicleMap[value];

    if (!vehicle) {
      return;
    }

    const interval$ = timer(0, TWO_HOURS + ONE_MIN);
    const makeReservation$ = interval$.pipe(
      switchMap(() => this.rest.makeReservation(vehicle))
    );

    const sub = this.subscribeAfterUpdatingState(makeReservation$);

    if (vehicle) {
      this.activeSubscriptionsMap.set(vehicle.vehicle, sub);
    }
  }

  cancel(event: MouseEvent, reservation: { id: string; key: string }): void {
    event.preventDefault();

    this.subscribeAfterUpdatingState(this.rest.cancelReservation(reservation));
    const activeSubscription = this.activeSubscriptionsMap.get(reservation.key);
    activeSubscription?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  getEndsAt(endsAt: string): string {
    const endDate = new Date(endsAt);
    const endAtHours = endDate.getHours() % 12;
    const amOrPm = endDate.getHours() >= 12 ? "PM" : "AM";
    const endAtMins = endDate.getMinutes();

    const endAtDate = endDate.getDate();
    const endAtMonth = endDate.getMonth();
    return `${endAtHours}:${endAtMins}${amOrPm} on ${endAtMonth}/${endAtDate}`;
  }
}
