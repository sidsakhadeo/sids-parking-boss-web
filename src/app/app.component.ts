import { Component } from "@angular/core";
import { FormControl } from "@angular/forms";
import {
  combineLatest,
  map,
  Observable,
  Subject,
  switchMap,
  tap,
} from "rxjs";
import { Reservation, Usage, VehicleMap } from "./interfaces";
import { RestApiService } from "./services/rest-api.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "parking";

  currentReservations$: Subject<Reservation[]>;
  checkUsage$: Subject<Usage>;

  vehicleMap: VehicleMap | undefined;
  vehicleMapKeys: string[] | undefined;
  vehicleFormControl: FormControl;

  subscribeAfterUpdatingState = (obs$: Observable<unknown>): void => {
    const getReservationsAndUsage$ = switchMap(() =>
      combineLatest([this.rest.getReservations(), this.rest.checkUsage()])
    );

    const updateUsageAndReservations$ = map(
      ([reservations, usage]: [reservations: Reservation[], usage: Usage]) => {
        this.currentReservations$.next(reservations);
        this.checkUsage$.next(usage);
      }
    );

    obs$.pipe(getReservationsAndUsage$, updateUsageAndReservations$).subscribe({
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
    let vehicle;

    if (this.vehicleMap) {
      vehicle = this.vehicleMap[value];
    }

    if (!vehicle) {
      return;
    }

    this.subscribeAfterUpdatingState(this.rest.makeReservation(vehicle));
  }

  cancel(event: MouseEvent, reservation: { id: string }): void {
    event.preventDefault();

    this.subscribeAfterUpdatingState(this.rest.cancelReservation(reservation));
  }
}
