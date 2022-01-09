import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { decode } from '@googlemaps/polyline-codec';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer } from 'rxjs';
import { DateTime } from 'luxon';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
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

  private subscription?: Subscription;

  constructor(private http: HttpClient) { }

  ngAfterViewInit() {
    this.map = L.map('map').setView([42.389118, -71.097153], 13);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/dark-v10',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1IjoiY3JhaWdhdHJvbiIsImEiOiJja3h5MHYxaXoxNTl2MnZyc3VpYTkzcHMxIn0.WCDbxlYVQvVIsN3EG-juFQ'
    }).addTo(this.map);
    this.http.get<string[]>('https://storage.googleapis.com/craigatron-strava-data-public/2022_stats.json').subscribe((stats: any) => {
      this.totalMiles = stats['total_mi'] as number;
      this.craigFaceX = ((this.progressBarWidth * (this.totalMiles / this.targetMiles)) - 25) + 'px';
      this.totalMilesStr = this.totalMiles.toFixed(2);
      this.lastUpdated = DateTime.fromISO(stats['last_updated']).toLocaleString({ month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false, timeZoneName: 'short' });
      for (const line of stats['polylines']) {
        const polyline = L.polyline(decode(line)).addTo(this.map!);
        polyline.on('mouseover', () => {
          polyline.setStyle({ weight: 6 });
        });
        polyline.on('mouseout', () => {
          polyline.setStyle({ weight: 3 });
        });
      }
      this.subscription = timer(1000, 1000).subscribe(() => {
        this.flipCraigFace = !this.flipCraigFace;
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
