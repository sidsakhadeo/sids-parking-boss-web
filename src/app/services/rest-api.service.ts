import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map, mergeMap, Observable } from "rxjs";
import { getViewpoint } from "../utilities";
import {
  AccountConfig,
  ConfigsResponse,
  Reservation,
  Usage,
} from "../interfaces";

const RESERVE_URL = "https://api.parkingboss.com/v1/permits/temporary";
const CURENT_RESERVATIONS_TOKENS_URL =
  "https://api.parkingboss.com/v1/accounts/auth/tokens";

@Injectable({
  providedIn: "root",
})
export class RestApiService {
  config: AccountConfig | undefined;

  constructor(private http: HttpClient) {}

  getConfigs(): Observable<ConfigsResponse> {
    const domain = window.location.hostname;
    return this.http.get<string>(`http://${domain}:8080/configs`).pipe(
      map((res) => {
        const result: ConfigsResponse = JSON.parse(JSON.stringify(res));
        this.config = result.account;
        return result;
      })
    );
  }

  getReservations(): Observable<Reservation[]> {
    const viewpoint = getViewpoint();
    const location = this.config?.location || "";
    const tenant = this.config?.tenant || "";
    const token = this.config?.token || "";

    const params = new HttpParams()
      .set("viewpoint", viewpoint)
      .set("location", location)
      .set("tenant", tenant)
      .set("password", token);

    return this.http
      .post<{ subject: string; token: string }>(
        CURENT_RESERVATIONS_TOKENS_URL,
        null,
        { params }
      )
      .pipe(
        mergeMap((res) => {
          const { subject, token: authToken } = res;
          const currentReservationsURL = `https://api.parkingboss.com/v1/locations/${location}/tenants/${subject}/permits`;

          const now = new Date();
          now.setMonth(now.getMonth() + 1);
          const valid = `${viewpoint}/${now.toISOString()}`;

          const params = new HttpParams()
            .set("viewpoint", viewpoint)
            .set("valid", valid)
            .set("Authorization", `bearer ${authToken}`);

          return this.http.get<{
            permits: {
              items: {
                [key: string]: {
                  title: string;
                  vehicle: string;
                  name: string;
                  id: string;
                  grace: { min: { local: string }; max: { local: string } };
                };
              };
            };
            vehicles: { items: { [key: string]: { display: string } } };
          }>(currentReservationsURL, { params });
        }),
        map((res) => {
          const items = res.permits.items;
          const vehicles = res.vehicles.items;

          const validPermitsKeys = Object.keys(items).filter(
            (key) => items[key].title === "Guest Parking Digital Permit"
          );

          const result: Reservation[] = [];

          validPermitsKeys.forEach((key) => {
            const obj = Object.assign(
              {},
              { ...vehicles[items[key].vehicle] },
              { ...items[key] }
            );
            result.push(obj);
          });

          return result;
        })
      );
  }

  makeReservation(inputVehicle: {
    vehicle: string;
    notes: string;
    name: string;
  }): Observable<unknown> {
    const viewpoint = getViewpoint();
    const { vehicle, notes, name } = inputVehicle;
    const location = this.config?.location || "";
    const policy = this.config?.policy || "";
    const space = this.config?.space || "";
    const duration = this.config?.duration || "";
    const tenant = this.config?.tenant || "";
    const token = this.config?.token || "";
    const email = this.config?.email || "";
    const tel = this.config?.tel || "";

    const params = new HttpParams()
      .set("viewpoint", viewpoint)
      .set("location", location)
      .set("policy", policy)
      .set("tenant", tenant)
      .set("token", token)
      .set("vehicle", vehicle)
      .set("space", space)
      .set("duration", duration)
      .set("notes", notes)
      .set("name", name)
      .set("email", email)
      .set("tel", tel);

    return this.http.post<{ subject: string; token: string }>(
      RESERVE_URL,
      null,
      { params }
    );
  }

  cancelReservation(permit: { id: string }): Observable<unknown> {
    const viewpoint = getViewpoint();
    const { id } = permit;
    const email = this.config?.email || "";

    const EXPIRY_URL = `https://api.parkingboss.com/v1/permits/${id}/expires`;

    const params = new HttpParams()
      .set("viewpoint", viewpoint)
      .set("_method", "PUT")
      .set("permit", id)
      .set("to", email);

    return this.http.put(EXPIRY_URL, null, { params });
  }

  checkUsage(): Observable<Usage> {
    const viewpoint = getViewpoint();
    const location = this.config?.location || "";
    const tenant = this.config?.tenant || "";
    const token = this.config?.token || "";

    const params = new HttpParams()
      .set("viewpoint", viewpoint)
      .set("location", location)
      .set("tenant", tenant)
      .set("password", token);

    return this.http
      .post<{ subject: string; token: string }>(
        CURENT_RESERVATIONS_TOKENS_URL,
        null,
        { params }
      )
      .pipe(
        mergeMap((res) => {
          const { subject, token: authToken } = res;
          const checkUsageURL = `https://api.parkingboss.com/v1/locations/${location}/tenants/${subject}/permits/temporary/usage`;

          const params = new HttpParams()
            .set("viewpoint", viewpoint)
            .set("sample", "PT24H")
            .set("Authorization", `bearer ${authToken}`);

          return this.http.get<{
            limits: {
              items: {
                [key: string]: {
                  display: string;
                  id: string;
                  per: "P1W" | "P1M";
                };
              };
            };
            usage: {
              items: {
                [key: string]: {
                  used: {
                    [key: string]: {
                      display: string;
                    };
                  };
                };
              };
            };
          }>(checkUsageURL, { params });
        }),
        map((res) => {
          console.log(res);

          const limitItems = res.limits.items;
          const usageItems = res.usage.items;

          let weeklyLimit: { id: string; display: string } | undefined;
          let monthlyLimit: { id: string; display: string } | undefined;
          let weeklyUsage;
          let monthlyUsage;

          Object.keys(limitItems).forEach((limitItemKey) => {
            const limitItem = limitItems[limitItemKey];
            if (limitItem.per === "P1W") {
              weeklyLimit = {
                id: limitItem.id,
                display: limitItem.display.split(" ")[0],
              };
            } else if (limitItem.per === "P1M") {
              monthlyLimit = {
                id: limitItem.id,
                display: limitItem.display.split(" ")[0],
              };
            }
          });

          if (weeklyLimit !== undefined) {
            const weeklyUsageObj = usageItems[weeklyLimit.id].used;
            const interalKey = Object.keys(weeklyUsageObj)[0];
            weeklyUsage = weeklyUsageObj[interalKey].display;
            weeklyUsage = weeklyUsage.split(" ")[0];
          }

          if (monthlyLimit !== undefined) {
            const monthlyUsageObj = usageItems[monthlyLimit.id].used;
            const interalKey = Object.keys(monthlyUsageObj)[0];
            monthlyUsage = monthlyUsageObj[interalKey].display;
            monthlyUsage = monthlyUsage.split(" ")[0];
          }

          return {
            weeklyLimit: weeklyLimit?.display,
            monthlyLimit: monthlyLimit?.display,
            weeklyUsage,
            monthlyUsage,
          };
        })
      );
  }
}
