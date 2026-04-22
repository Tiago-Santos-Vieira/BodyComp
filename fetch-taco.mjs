import fs from 'fs';

fetch('https://raw.githubusercontent.com/marcelosanto/tabela_taco/master/TACO.json')
  .then(res => res.json())
  .then(data => {
    const formatted = data.map(item => {
      const parseValue = (val) => {
        if (val === 'NA' || val === 'Tr' || val === '*' || val === '' || val == null) return 0;
        let num;
        if (typeof val === 'number') {
            num = val;
        } else if (typeof val === 'string') {
            num = parseFloat(val.replace(',', '.'));
        }
        return isNaN(num) ? 0 : Math.round(num * 10) / 10;
      };

      return {
        id: 't' + item.id,
        name: item.description,
        kcal: parseValue(item.energy_kcal),
        prot: parseValue(item.protein_g),
        carb: parseValue(item.carbohydrate_g),
        gord: parseValue(item.lipid_g)
      };
    });

    const fileContent = `export const tacoData = ${JSON.stringify(formatted, null, 2)};`;
    
    fs.writeFileSync('src/data/taco.ts', fileContent);
    console.log('TACO data imported successfully! Count: ' + formatted.length);
  })
  .catch(err => console.error('Error:', err));
