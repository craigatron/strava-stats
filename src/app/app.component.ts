import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { decode } from '@googlemaps/polyline-codec';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer } from 'rxjs';
import { DateTime } from 'luxon';

interface Activity {
  id: number;
  name: string;
  date: string;
  distanceMi: number;
  polyline: L.Polyline;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;

  readonly targetMiles = 1700;
  readonly progressBarWidth = 500;
  totalMiles?: number;
  totalMilesStr?: string;
  lastUpdated?: string;
  craigFaceX = '50px';
  flipCraigFace = false;

  private allActivities: Activity[] = [];

  private subscription?: Subscription;

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    this.map = L.map('map').setView([42.389118, -71.097153], 13);
    L.tileLayer(
      'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/dark-v10',
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          'pk.eyJ1IjoiY3JhaWdhdHJvbiIsImEiOiJja3h5MHYxaXoxNTl2MnZyc3VpYTkzcHMxIn0.WCDbxlYVQvVIsN3EG-juFQ',
      }
    ).addTo(this.map);
    this.http
      .get<string[]>(
        'https://storage.googleapis.com/craigatron-strava-data-public/2022_stats.json'
      )
      .subscribe((stats: any) => {
        this.totalMiles = stats['total_mi'] as number;
        this.craigFaceX =
          this.progressBarWidth * (this.totalMiles / this.targetMiles) -
          25 +
          'px';
        this.totalMilesStr = this.totalMiles.toFixed(2);
        this.lastUpdated = DateTime.fromISO(
          stats['last_updated']
        ).toLocaleString({
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
          timeZoneName: 'short',
        });
        for (const activity of stats['activities']) {
          const polyline = L.polyline(decode(activity['polyline'])).addTo(
            this.map!
          );
          this.allActivities.push({
            id: activity['id'],
            name: activity['name'],
            date: activity['date'],
            distanceMi: activity['distance_mi'],
            polyline: polyline,
          });
          polyline.on('click', (e: any) => {
            this.highlightNearbyPolylines(e.latLng as L.LatLng);
          });
          polyline.on('mouseover', (e: any) => {
            this.highlightNearbyPolylines(e.latlng as L.LatLng);
          });
          polyline.on('mouseout', (e) => {
            this.resetPolylines();
          });
        }
        this.subscription = timer(1000, 1000).subscribe(() => {
          this.flipCraigFace = !this.flipCraigFace;
        });
      });
  }

  private highlightNearbyPolylines(latLng: L.LatLng) {
    const distances: [number, Activity][] = [];
    const point = this.map!.latLngToLayerPoint(latLng);
    for (const activity of this.allActivities) {
      const closestPoint = activity.polyline.closestLayerPoint(point);
      if (closestPoint) {
        const distance = point.distanceTo(
          activity.polyline.closestLayerPoint(point)
        );
        distances.push([distance, activity]);
      }
    }
    distances.sort((a, b) => a[0] - b[0]);

    let lines = [];
    for (const d of distances) {
      if (d[0] < 5) {
        d[1].polyline.setStyle({ weight: 6 });
        lines.push(
          `<li>${d[1].date}: <a href="https://www.strava.com/activities/${
            d[1].id
          }" target="_blank">${d[1].name}</a> - ${d[1].distanceMi.toFixed(
            2
          )} mi</li>`
        );
      } else {
        break;
      }
    }
    // what a dumb way of getting these in chronological order
    lines.sort().reverse();
    const originalLength = lines.length;
    if (originalLength > 10) {
      lines = lines.slice(0, 10);
    }

    L.popup()
      .setLatLng(latLng)
      .setContent(
        `<ul style="list-style-type: none; padding: 0; margin: 0;">${lines.join(
          ''
        )}</ul>` +
          (originalLength > 10
            ? `<div>...and ${originalLength - 10} more</div>`
            : '')
      )
      .openOn(this.map!);
  }

  private resetPolylines() {
    this.map?.closePopup();
    this.allActivities.forEach((a) => {
      a.polyline.setStyle({ weight: 3 });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
