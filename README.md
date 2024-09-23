# nc-pivitor

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

Possible formula for generating new coordinates based on pivot distances for 5Axis tool paths

```
X_new = X_old + ((X_old / Pivot_old) * (Pivot_new - Pivot_old))
Y_new = Y_old + ((Y_old / Pivot_old) * (Pivot_new - Pivot_old))
Z_new = Z_old + ((Z_old / Pivot_old) * (Pivot_new - Pivot_old))
```

```
X_new = -5.2182 + ((-5.2182 / 12.9075) * (12.8708 - 12.9075))
      = -5.2182 + ((-5.2182 / 12.9075) * -0.0367)
      = -5.2182 + (-0.01479)
      ≈ -5.205

Y_new = -2.6078 + ((-2.6078 / 12.9075) * -0.0367)
      = -2.6078 + (-0.00741)
      ≈ -2.6157

Z_new = 12.4039 + ((12.4039 / 12.9075) * -0.0367)
      = 12.4039 + (0.00343)
      ≈ 12.4073
```

Example

```
const fs = require('fs');

// Function to calculate new coordinates based on pivot distance
function calculateNewCoordinates(X_old, Y_old, Z_old, Pivot_old, Pivot_new) {
    const X_new = X_old + ((X_old / Pivot_old) * (Pivot_new - Pivot_old));
    const Y_new = Y_old + ((Y_old / Pivot_old) * (Pivot_new - Pivot_old));
    const Z_new = Z_old + ((Z_old / Pivot_old) * (Pivot_new - Pivot_old));

    return { X_new, Y_new, Z_new };
}

// Example coordinates (from the file with pivot distance 12.9075)
const coordinates = {
    X: -5.1933,
    Y: -2.5985,
    Z: 12.3646
};
const Pivot_old = 12.9075;
const newPivotDistances = [12.8708, 12.7900];

// Generate new files with updated coordinates
newPivotDistances.forEach(Pivot_new => {
    const { X_new, Y_new, Z_new } = calculateNewCoordinates(
        coordinates.X, coordinates.Y, coordinates.Z, Pivot_old, Pivot_new
    );

    // Format the new G-code line
    const gcodeLine = `G01 X${X_new.toFixed(4)} Y${Y_new.toFixed(4)} Z${Z_new.toFixed(4)}\n`;

    // Write the new G-code to a file (you can replace this with actual file read/write)
    fs.writeFileSync(`output_${Pivot_new}.nc`, gcodeLine);
    console.log(`Generated G-code for pivot ${Pivot_new}: ${gcodeLine}`);
});

```
