import { Component } from "@angular/core";
import { FormControl } from "@angular/forms";
import { combineLatest, mergeMap, Subject } from "rxjs";
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

  constructor(private rest: RestApiService) {
    this.vehicleFormControl = new FormControl("");
    this.currentReservations$ = new Subject<Reservation[]>();
    this.checkUsage$ = new Subject<Usage>();

    this.rest
      .getConfigs()
      .pipe(
        mergeMap((res) => {
          this.vehicleMap = res.vehicleMap;
          this.vehicleMapKeys = Object.keys(this.vehicleMap);

          return combineLatest([
            this.rest.getReservations(),
            this.rest.checkUsage(),
          ]);
        })
      )
      .subscribe({
        next: ([reservations, usage]: [
          reservations: Reservation[],
          usage: Usage
        ]) => {
          this.currentReservations$.next(reservations);
          this.checkUsage$.next(usage);
        },
        error: console.error,
      });
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

    this.rest
      .makeReservation(vehicle)
      .pipe(
        mergeMap(() => {
          return this.rest.getReservations();
        }),
        mergeMap((reservations: Reservation[]) => {
          this.currentReservations$.next(reservations);
          return this.rest.checkUsage();
        })
      )
      .subscribe({
        next: (usage: Usage) => {
          this.checkUsage$.next(usage);
        },
        error: console.error,
      });
  }

  cancel(event: MouseEvent, reservation: { id: string }): void {
    event.preventDefault();

    this.rest
      .cancelReservation(reservation)
      .pipe(
        mergeMap(() => {
          return this.rest.getReservations();
        }),
        mergeMap((reservations: Reservation[]) => {
          this.currentReservations$.next(reservations);
          return this.rest.checkUsage();
        })
      )
      .subscribe({
        next: (usage: Usage) => {
          this.checkUsage$.next(usage);
        },
        error: console.error,
      });
  }
}
