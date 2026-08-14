import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { WatchlistService } from '../../services/watchlist.service';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-watchlist-detail',
  imports: [RouterLink, MatIcon, MatButton, MatIconButton, MovieCardComponent, EmptyStateComponent],
  templateUrl: './watchlist-detail.component.html',
  styleUrl: './watchlist-detail.component.scss',
})
export class WatchlistDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);

  private readonly id = signal<string>('');

  protected readonly watchlist = computed<Watchlist | undefined>(() =>
    this.watchlistService.watchlists().find(watchlist => watchlist.id === this.id()),
  );

  protected readonly movies = computed(() => this.watchlist()?.movies ?? []);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/watchlists']);
      return;
    }
    this.id.set(id);
  }

  protected goBack(): void {
    const state = this.location.getState() as { navigationId?: number };
    if (state?.navigationId && state.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/watchlists']);
    }
  }

  protected removeMovie(movieId: number): void {
    const watchlist = this.watchlist();
    if (!watchlist) return;
    this.watchlistService.removeMovie(watchlist.id, movieId).subscribe({
      next: () => this.notifications.success('Film verwijderd uit watchlist'),
    });
  }
}
