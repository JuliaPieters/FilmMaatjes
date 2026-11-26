import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styles: `
    /* Op mobiel voelt een footer onder elke pagina als een website, niet als een app */
    .footer {
      display: none;
      border-top: 1px solid rgba(var(--color-white-rgb), 0.06);

      @media (min-width: 768px) {
        display: block;
      }
    }

    .footer-inner {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem 2rem;
      max-width: var(--page-max);
      margin: 0 auto;
      padding: 1.75rem var(--gutter);
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: var(--color-text-soft);

      img {
        border-radius: 6px;
      }
    }

    .footer-links {
      display: flex;
      gap: 1.5rem;
      font-size: 0.875rem;

      a {
        color: var(--color-text-meta);
        transition: color 0.15s var(--ease);

        &:hover {
          color: var(--color-text-primary);
        }
      }
    }

    .footer-meta {
      margin: 0 0 0 auto;
      font-size: 0.8125rem;
      color: var(--color-text-muted);

      a {
        color: var(--color-accent-light);
      }
    }
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
