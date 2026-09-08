# Proyecto de Gestion de ingresos
Este proyecto esta realizado para la gestion de los ingresos o gastos que puede tener 
una persona o familia, organizando en diferentes secciones, como que tipo de banco almacena los ingresos, registro de gastos mensuales.

# Tabla de contenidos
- Tecnologías
- Que propuesta tiene el proyecto?
- Como piensa trabajar el proyecto
- Arquitectura del proyecto
- Base de datos y autenticación
- Roles de usuarios
- Primera parte: DashBoard normal
- Segunda Parte: DashBoard de ingresos
- Puntos clave de mi aplicacion
- Cálculo de IVA e Ingresos
- Como ejecutar el proyecto

# Tecnologías

## Backend
| Tecnología |
**Node.js** 
**Express** 
**TypeScript** 
**PostgreSQL** 
**jsonwebtoken** 
**bcryptjs** 
**express-validator** 
**Helmet**

## Frontend
| Tecnología |
**Angular**
**TypeScript**
**TailwindCSS**
**Three.js**

# Que propuesta tiene el proyecto?
Es una aplicación centralizada en el control de los recursos financieros, diseñada para ayudar a una persona o familia a registrar, categorizar y visualizar sus ingresos y gastos diarios/mensuales en tiempo real, permitiéndole tomar mejores decisiones sobre su dinero. También trae un apartado de ahorro y reportes claros de los gastos.

# Como piensa trabajar el proyecto 
El primer paso es decidir que tipo de BD quiero relacional o no relacional, En mi caso elegi la opcion de relacional porque se me facilita, tambien se me pidio que le implmentara JWT y GitHub, EL login es la primera parte solicitada para que se vea el avance del proyecto.

la estructura del proyecto es dividirla en dos carpetas el fornted y el backend para facilitar su uso, el backend llevara el codigo para que funcione el codigo y el fronted llevara las vistas para que se funcional.

# Arquitectura del proyecto
El proyecto está dividido en dos carpetas principales: frontend y backend, para separar responsabilidades y facilitar su mantenimiento. 

- El backend expone una API REST y el frontend consume esa API, El backend siguie esta arquitectura por capas: Ruta -> Middleware -> Controlador -> Servicio -> Repositorio -> PostgreSQL.

- El frontend en Angular sigue el patrón de servicios con signals para el estado (ingresos, categorías, tendencia), guards para proteger rutas privadas, e interceptores HTTP para adjuntar el token JWT a cada petición y manejar sesiones expiradas.

# Base de datos y autenticación
El primer paso fue decidir el tipo de base de datos: relacional o no relacional. Se eligió PostgreSQL por facilidad de modelado, dado que los ingresos, gastos y usuarios tienen una relación clara entre sí. También se pidió implementar JWT para la autenticación, El login fue lo primero para mostrar avance del proyecto.

# Roles de usuarios
El sistema contiene dos roles: user (usuario normal) y admin. El rol viaja dentro del propio token JWT y se valida en el backend mediante un middleware específico (roleMiddleware), que restringe ciertos endpoints.

# Primera parte: DashBoard normal
Se realizara la parte de un dashboar inicial que tendra como funcion poder alvergar otras funciones como: ingresos, egresos, configuracion, reportes y historial de gastos. Cada una tendra su apartado dentro del dashBoard junto con sus respectivas funciones y tambien tendra una grafica en foma de dona inplementada que es de ahorro vs gasto de mes a mes.

# Segunda Parte: DashBoard de ingresos
Se realizara la parte de ingresar los ingresos de la persona es un tipo formulario que la persona debe de llenar con sus datos bancarios como: su banco, numero de cuenta, tipo de cuenta etc. al ingresar esos datos y la cantidad a ingresar se reiniciara para poder volver a ingresar nuevos ingresos, aparte tambien tendra una grafica mes a mes para ver el flujo de los ingresos.

# Puntos clave de mi aplicacion
- control del dinero en tiempo real.
- visibilidad y habitos en que se gasta.
- Toma de decisiones sobre el dinero.
- Mas facilidad para poder manejarlo.

# Cálculo de IVA e Ingresos
- IVA = monto × 0.12.    
- Neto = monto × 0.88.
- Pago = PAGO POR HORA / 40 horas semanales.

# Como ejecutar el proyecto
- bajar le proyecto de gitHub. en la terminal escribe "git clone https://github.com/epalencia-2025050/Gestion_de_ingresos.git" despues "cd Gestion_de_ingresos".

- Una ves dentro verifica que estas en la rama main. escribe "git branch"

- Ve a visual estudio code y abre la carpeta del proyecto, se abriran dos carpetas "fornted y backend".

- En el codigo del backend hay una carpeta que dice "database" abre el archivo de schemas.sql y seed.sql ve a potgres y pega el codigo de los dos archivos y ejecutalos precionando "F5" se crearia la base de datos local.

- Abre en visual la primera terminal y en la terminal, Escribe "cd backend" despues "pnpm install" esperas a que termine y escribes "pnpm run dev" y dejas que termine.

- Abre en visual la segunda termina y en la terminal, Escirbe "cd fornted" despues "pnpm install" esperas a que se instale y escribes "pnpm start"

- En la segunda terminal te dara un puerto que es http://localhost:4200/ este copialo y pegalo en el navegador web de tu seleccion, a este punto ya estas dentro de la aplicacion.

*Desarollado por Eduardo Emilio Palencia Mejia.* 
