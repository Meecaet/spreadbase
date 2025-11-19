# Spreadbase
Spreadbase is a lightweight, robust Object-Relational Mapper (ORM) for Google Apps Script. It allows you to use a Google Spreadsheet as a relational database using TypeScript classes, decorators, and standard repository patterns.

It is designed for personal projects, prototypes, and small internal tools where a full SQL database is overkill, but raw spreadsheet manipulation is too messy.

🌐 Choose your language / Choisissez votre langue / Escolha seu idioma
<details open> <summary><strong>🇺🇸 English</strong></summary>

## Features
**Code-First Design**: Define your schema using TypeScript classes and decorators (@Entity, @Column).

**Relationships**: Full support for OneToOne, OneToMany, and ManyToOne with eager loading.

**Automatic ID Management**: Built-in Auto-Increment support for primary keys.

**Future - Transactions**: Uses a UnitOfWork pattern to batch changes (inserts, updates, deletes).

**Zero Config**: Can automatically create the database file and sync schema headers (context.sync()).

**Type Marshalling**: Handles JSON objects and Date serialization automatically.

## Installation

```Bash
npm install spreadbase reflect-metadata
```
Note: You must enable experimentalDecorators and disable emitDecoratorMetadata in your tsconfig.json.

## Quick Start

1. Define your Entities

```TypeScript
import { Entity, Column, PrimaryKey, OneToMany, ManyToOne } from 'spreadbase';

@Entity({ sheetName: 'Users' })
export class User {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  name!: string;

  @OneToMany(() => Post, { foreignKey: 'userId' })
  posts!: Post[];
}

@Entity({ sheetName: 'Posts' })
export class Post {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  title!: string;

  @Column() 
  userId!: number;

  @ManyToOne(() => User, { foreignKey: 'userId' })
  user!: User;
}
```
2. Usage

```TypeScript
import { SpreadbaseContext } from 'spreadbase';

function main() {
  // Initialize (Creates file if not exists)
  const context = new SpreadbaseContext({
    folderId: 'YOUR_DRIVE_FOLDER_ID',
    databaseName: 'MyDatabase'
  }) as any;

  // Ensure schema headers exist
  context.sync();

  // Create
  const user = new User();
  user.name = "Alice";
  context.Users.add(user);
  context.SaveChanges(); // Writes to Sheet

  // Read & Relate
  const post = new Post();
  post.title = "Hello World";
  post.userId = user.id; // ID was auto-assigned
  context.Posts.add(post);
  context.SaveChanges();

  // Query with Eager Loading
  const fetchedUser = context.Users.find(user.id);
  console.log(fetchedUser.posts[0].title); // "Hello World"
}
```

## Limitations

Spreadbase is an abstraction over Google Sheets. It is **not** a replacement for PostgreSQL or MongoDB for high-concurrency or large-scale applications. It is limited by Google Apps Script quotas and the performance limits of Google Sheets (approx. 5-10 million cells, but performance degrades earlier).

</details>

<details> <summary><strong>🇨🇦 Français (Canadien)</strong></summary>

## Fonctionnalités

**Approche Code-First** : Définissez votre schéma à l'aide de classes TypeScript et de décorateurs (@Entity, @Column).

**Relations** : Support complet pour OneToOne, OneToMany, et ManyToOne avec chargement hâtif (eager loading).

**Gestion Automatique des ID** : Support intégré pour l'auto-incrémentation des clés primaires.

**Pour le futur - Transactions** : Utilise le patron UnitOfWork pour regrouper les changements (insertions, mises à jour, suppressions).

**Configuration Zéro** : Peut créer automatiquement le fichier de base de données et synchroniser les en-têtes de schéma (context.sync()).

**Sérialisation des Types** : Gère automatiquement les objets JSON et les dates.

## Installation

```Bash
npm install spreadbase reflect-metadata
```
Note : Vous devez activer experimentalDecorators et désactiver emitDecoratorMetadata dans votre tsconfig.json.

## Démarrage Rapide

1. Définir vos Entités

```TypeScript
import { Entity, Column, PrimaryKey, OneToMany, ManyToOne } from 'spreadbase';

@Entity({ sheetName: 'Utilisateurs' })
export class Utilisateur {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  nom!: string;

  @OneToMany(() => Publication, { foreignKey: 'utilisateurId' })
  publications!: Publication[];
}

@Entity({ sheetName: 'Publications' })
export class Publication {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  titre!: string;

  @Column() 
  utilisateurId!: number;

  @ManyToOne(() => Utilisateur, { foreignKey: 'utilisateurId' })
  utilisateur!: Utilisateur;
}
```
2. Utilisation

```TypeScript
import { SpreadbaseContext } from 'spreadbase';

function main() {
  // Initialisation (Crée le fichier s'il n'existe pas)
  const context = new SpreadbaseContext({
    folderId: 'ID_DE_VOTRE_DOSSIER_DRIVE',
    databaseName: 'MaBaseDeDonnees'
  }) as any;

  // S'assure que les en-têtes de schéma existent
  context.sync();

  // Création
  const user = new Utilisateur();
  user.nom = "Alice";
  context.Utilisateurs.add(user);
  context.SaveChanges(); // Écrit dans la feuille de calcul

  // Lecture et Relation
  const pub = new Publication();
  pub.titre = "Bonjour le monde";
  pub.utilisateurId = user.id; // L'ID a été assigné automatiquement
  context.Publications.add(pub);
  context.SaveChanges();

  // Requête avec chargement hâtif
  const fetchedUser = context.Utilisateurs.find(user.id);
  console.log(fetchedUser.publications[0].titre); // "Bonjour le monde"
}
```
## Limitations
Spreadbase est une abstraction par-dessus Google Sheets. Ce **n'est pas** un remplacement pour PostgreSQL ou MongoDB pour des applications à haute concurrence ou à grande échelle. Il est limité par les quotas de Google Apps Script et les limites de performance de Google Sheets.

</details>

<details> <summary><strong>🇧🇷 Português (Brasileiro)</strong></summary>

## Funcionalidades

**Design Code-First**: Defina seu esquema usando classes TypeScript e decorators (@Entity, @Column).

**Relacionamentos**: Suporte completo para OneToOne, OneToMany e ManyToOne com carregamento ansioso (eager loading).

**Gerenciamento Automático de ID**: Suporte nativo para Auto-Incremento de chaves primárias.

**Futuramente - Transações**: Utiliza o padrão UnitOfWork para agrupar alterações (inserções, atualizações, exclusões).

**Zero Configuração**: Pode criar automaticamente o arquivo de banco de dados e sincronizar o cabeçalho do esquema (context.sync()).

**Serialização de Tipos**: Lida automaticamente com objetos JSON e datas.

## Instalação

```
npm install spreadbase reflect-metadataBash
```
Nota: Você deve habilitar experimentalDecorators e desabilitar emitDecoratorMetadata no seu tsconfig.json.

## Início Rápido

1. Defina suas Entidades

```TypeScript
import { Entity, Column, PrimaryKey, OneToMany, ManyToOne } from 'spreadbase';

@Entity({ sheetName: 'Usuarios' })
export class Usuario {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  nome!: string;

  @OneToMany(() => Postagem, { foreignKey: 'usuarioId' })
  postagens!: Postagem[];
}

@Entity({ sheetName: 'Postagens' })
export class Postagem {
  @PrimaryKey({ autoIncrement: true }) 
  @Column() 
  id!: number;

  @Column() 
  titulo!: string;

  @Column() 
  usuarioId!: number;

  @ManyToOne(() => Usuario, { foreignKey: 'usuarioId' })
  usuario!: Usuario;
}
```

2. Uso

```TypeScript
import { SpreadbaseContext } from 'spreadbase';

function main() {
  // Inicialização (Cria o arquivo se não existir)
  const context = new SpreadbaseContext({
    folderId: 'SEU_ID_DA_PASTA_DRIVE',
    databaseName: 'MeuBancoDeDados'
  }) as any;

  // Garante que os cabeçalhos do esquema existam
  context.sync();

  // Criar
  const user = new Usuario();
  user.nome = "Alice";
  context.Usuarios.add(user);
  context.SaveChanges(); // Escreve na Planilha

  // Ler e Relacionar
  const post = new Postagem();
  post.titulo = "Olá Mundo";
  post.usuarioId = user.id; // O ID foi atribuído automaticamente
  context.Postagens.add(post);
  context.SaveChanges();

  // Consulta com Carregamento Ansioso
  const usuarioBuscado = context.Usuarios.find(user.id);
  console.log(usuarioBuscado.postagens[0].titulo); // "Olá Mundo"
}
```
## Limitações

O Spreadbase é uma camada de abstração sobre o Google Sheets. Ele **não** substitui o PostgreSQL ou MongoDB para aplicações de alta concorrência ou grande escala. Ele é limitado pelas cotas do Google Apps Script e pelos limites de desempenho do Google Sheets.

</details>

Configuration (tsconfig.json)
To ensure Spreadbase works correctly with clasp and rollup, ensure your configuration matches these settings:
```JSON

{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false, 
    "types": ["google-apps-script", "node"]
  }
}
```

Spreadbase — Made by Mateus Caetano (with Gemini help).
