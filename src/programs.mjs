/**
 * Cerama G20-20 factory programs, Danish manual v1.2 pp. 17-20.
 * SC 100 connected load: 7.0 kW.
 * P1-P7 use the manufacturer's approximate program time excluding natural cooling.
 * P8-P12 include controlled ramps/holds but contain a passive SkIP cooling phase whose duration is not stated.
 */
const seg=(rate,temp,hold=0)=>({rate,temp,hold});
const row=(id,name,temp,minutes,page,category,segments,note='')=>({id,name,temp,minutes,page,category,segments,note});
export const FACTORY_PROGRAMS=[
 row(1,'Langsom forglødning',980,810,17,'Keramik',[seg(50,100),seg(75,980,5)]),
 row(2,'Normal forglødning',980,510,17,'Keramik',[seg(100,650),seg(150,980,5)]),
 row(3,'Lertøjsglasur',1020,390,17,'Keramik',[seg(100,100),seg(150,650),seg(200,1020,15)]),
 row(4,'Stentøjsglasur',1260,460,17,'Keramik',[seg(100,100),seg(150,650),seg(200,1260,15)],'Må aldrig benyttes til lertøj.'),
 row(5,'Porcelænsmaling',800,360,18,'Keramik',[seg(100,100),seg(150,650),seg(100,800)]),
 row(6,'Udtørring af gods',200,540,18,'Udtørring',[seg(30,70,60),seg(50,200,240)]),
 row(7,'Udtørring af ovnplader',300,165,18,'Udtørring',[seg(100,300)]),
 row(8,'Tack fusing',760,null,19,'Bullseye / System96',[seg(150,600),seg(250,760,5),seg(null,520,90),seg(30,400)],'Indeholder en naturlig SkIP-afkøling, som manualen ikke tidsangiver.'),
 row(9,'Full fusing',800,null,19,'Bullseye / System96',[seg(150,600),seg(250,800,5),seg(null,520,90),seg(30,400)],'Indeholder en naturlig SkIP-afkøling, som manualen ikke tidsangiver.'),
 row(10,'Slumping',720,null,19,'Bullseye / System96',[seg(150,600),seg(250,720,5),seg(null,520,90),seg(20,400)],'Indeholder en naturlig SkIP-afkøling, som manualen ikke tidsangiver.'),
 row(11,'Full fusing',820,null,20,'Floatglas',[seg(150,600),seg(250,820,5),seg(null,540,90),seg(30,400)],'Indeholder en naturlig SkIP-afkøling, som manualen ikke tidsangiver.'),
 row(12,'Slumping',740,null,20,'Floatglas',[seg(150,600),seg(250,740,5),seg(null,540,90),seg(30,400)],'Indeholder en naturlig SkIP-afkøling, som manualen ikke tidsangiver.')
];
export const ALL_PROGRAMS=FACTORY_PROGRAMS;
export const DEFAULT_SETTINGS={power:7,loadFactor:0.5,startTemperature:20};
export function factoryProgram(id){const p=FACTORY_PROGRAMS.find(p=>p.id===Number(id));if(!p)throw Error('Ukendt fabriksprogram.');return p;}
