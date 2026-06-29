#!/usr/bin/env python3
"""Parse trainer_parties.h and generate trainer_parties.json"""

import re
import json

def parse_trainer_parties(input_file):
    with open(input_file, 'r') as f:
        content = f.read()
    
    parties = []
    
    # Match each party definition
    party_pattern = re.compile(
        r'static const struct (TrainerMon\w+)\s+sParty_(\w+)\[\]\s*=\s*\{(.*?)\};',
        re.DOTALL
    )
    
    for match in party_pattern.finditer(content):
        struct_type = match.group(1)
        party_name = match.group(2)
        body = match.group(3)
        
        party = {
            "name": party_name,
            "type": struct_type,
            "pokemon": []
        }
        
        # Split by pokemon entries - each starts with { at beginning of line (after whitespace)
        # We need to handle nested braces for moves
        mon_blocks = []
        depth = 0
        current = []
        for line in body.split('\n'):
            stripped = line.strip()
            if stripped == '{':
                if depth == 0:
                    current = []
                depth += 1
            elif stripped == '},' or stripped == '}':
                depth -= 1
                if depth == 0:
                    mon_blocks.append('\n'.join(current))
            elif depth > 0:
                current.append(line)
        
        for mon_body in mon_blocks:
            mon = {}
            
            # Extract iv
            iv_match = re.search(r'\.iv\s*=\s*(\d+)', mon_body)
            if iv_match:
                mon["iv"] = int(iv_match.group(1))
            
            # Extract lvl
            lvl_match = re.search(r'\.lvl\s*=\s*(\d+)', mon_body)
            if lvl_match:
                mon["lvl"] = int(lvl_match.group(1))
            
            # Extract species (remove SPECIES_ prefix)
            species_match = re.search(r'\.species\s*=\s*SPECIES_(\w+)', mon_body)
            if species_match:
                mon["species"] = species_match.group(1)
            
            # Extract heldItem if present (remove ITEM_ prefix)
            item_match = re.search(r'\.heldItem\s*=\s*ITEM_(\w+)', mon_body)
            if item_match:
                mon["heldItem"] = item_match.group(1)
            
            # Extract moves if present (remove MOVE_ prefix)
            moves_match = re.search(r'\.moves\s*=\s*\{([^}]+)\}', mon_body)
            if moves_match:
                moves_str = moves_match.group(1)
                moves = re.findall(r'MOVE_(\w+)', moves_str)
                mon["moves"] = moves
            
            party["pokemon"].append(mon)
        
        parties.append(party)
    
    return parties

def main():
    parties = parse_trainer_parties('src/data/trainer_parties.h')
    
    output = {
        "parties": parties
    }
    
    with open('src/data/trainer_parties.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Parsed {len(parties)} parties")

if __name__ == '__main__':
    main()
