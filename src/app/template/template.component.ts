import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-template',
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.css']
})
export class TemplateComponent {

  constructor(private router: Router) {}

  currentYear: number = new Date().getFullYear();

  get showLayout(): boolean {
    const url = this.router.url;
    // Masquer le layout sur la page de login ('')
    return !(url === '/' || url === '' );
  }

}
