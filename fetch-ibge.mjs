import fs from 'fs';

fetch('https://raw.githubusercontent.com/nmarcofernandess/tabelas-nutricao/main/1_raw/ibge/ibge_composicao.csv')
  .then(res => res.text())
  .then(text => {
    const lines = text.split('\n');
    let data = [];
    
    for (let i = 4; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Custom split to ignore commas inside quotes
        let inQuote = false;
        let cell = '';
        let cols = [];
        for(let c=0; c < line.length; c++) {
            if (line[c] === '"') {
                inQuote = !inQuote;
            } else if (line[c] === ',' && !inQuote) {
                cols.push(cell.trim().replace(/^"|"$/g, ''));
                cell = '';
            } else {
                cell += line[c];
            }
        }
        cols.push(cell.trim().replace(/^"|"$/g, '')); // last column

        let nameCol = cols[1];
        let prepCol = cols[3];
        
        let kcalCol = cols[6];
        let protCol = cols[7];
        let fatCol = cols[8];
        let carbCol = cols[9];

        if (!nameCol) continue;
        
        if (!kcalCol || kcalCol === 'ENERGIA (kcal)') continue;
        
        const parseValue = (val) => {
            if (!val || val === 'NA' || val === 'Tr' || val === '*') return 0;
            const num = parseFloat(val.replace(',', '.'));
            return isNaN(num) ? 0 : Math.round(num * 10) / 10;
        };

        prepCol = prepCol ? prepCol.toLowerCase() : '';
        let fullName = nameCol;
        if (prepCol && prepCol !== 'cru' && prepCol !== 'cru(a)' && prepCol !== 'não se aplica') {
            fullName = `${nameCol} (${prepCol})`;
        }
        
        // Capitalize first letter properly
        fullName = fullName.charAt(0).toUpperCase() + fullName.slice(1).toLowerCase();

        data.push({
            id: 'ibge' + i,
            name: fullName,
            kcal: parseValue(kcalCol),
            prot: parseValue(protCol),
            carb: parseValue(carbCol),
            gord: parseValue(fatCol)
        });
    }

    const unique = [];
    const names = new Set();
    for (const item of data) {
       if (!names.has(item.name) && item.name.length > 2 && item.kcal > 0) {
          names.add(item.name);
          unique.push(item);
       }
    }

    console.log('Total items parsed: ', unique.length);
    console.log('Sample:', unique.slice(0, 3));
    
    // Create the exported list
    const fileContent = `export const ibgeData = ${JSON.stringify(unique, null, 2)};`;
    fs.writeFileSync('src/data/ibge.ts', fileContent);
  })
  .catch(err => console.error('Error:', err));
