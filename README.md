# DrawdownCalc_Web

This project serves as the frontend at [DrawdownCalc](https://www.drawdowncalc.com)

It started as a NextJS starter in Firebase Studio.  An embarrassing amount of this project has been written with the help of various AI agents.

## Dev Setup

To run this locally

```
npm run dev
```
By default this runs on port 9002.  To access the locally running version go to http://localhost:9002/ in your browser.

If you try to actually calculate a drawdown plan it will attempt to send a request to http://localhost:5001/calculate.  For that to work you need to be running a local copy of [drawdowncalc](https://github.com/hubcity/drawdowncalc)
