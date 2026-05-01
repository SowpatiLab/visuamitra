#!/usr/bin/env python
from collections import Counter
from bitarray import bitarray
import warnings
import pysam, sys
import regex as re

divisor_dict = {2:[1], 3:[1], 4:[1,2], 5:[1], 6:[1,2,3], 7:[1], 8:[1,2,4], 9:[1,3], 10:[1,2,5]}
decode64_dict = {'A': 0.0, 'B': 1.56, 'C': 3.12, 'D': 4.69, 'E': 6.25, 'F': 7.81, 'G': 9.38, 'H': 10.94, 'I': 12.5, 'J': 14.06,
 'K': 15.62, 'L': 17.19, 'M': 18.75, 'N': 20.31, 'O': 21.88, 'P': 23.44, 'Q': 25.0, 'R': 26.56, 'S': 28.12, 'T': 29.69, 'U': 31.25,
 'V': 32.81, 'W': 34.38, 'X': 35.94, 'Y': 37.5, 'Z': 39.06, 'a': 40.62, 'b': 42.19, 'c': 43.75, 'd': 45.31, 'e': 46.88, 'f': 48.44,
 'g': 50.0, 'h': 51.56, 'i': 53.12, 'j': 54.69, 'k': 56.25, 'l': 57.81, 'm': 59.38, 'n': 60.94, 'o': 62.5, 'p': 64.06, 'q': 65.62,
 'r': 67.19, 's': 68.75, 't': 70.31, 'u': 71.88, 'v': 73.44, 'w': 75.0, 'x': 76.56, 'y': 78.12, 'z': 79.69, '0': 81.25, '1': 82.81,
 '2': 84.38, '3': 85.94, '4': 87.5, '5': 89.06, '6': 90.62, '7': 92.19, '8': 93.75, '9': 95.31, '+': 96.88, '/': 100.0, '-':-1, '*':-2, '.':-2}

cyclic_motif_registry = {}
 
def motif_decomp_pos(dseq, MOTIF):

    dseq = dseq.split('-')
    motif_order = []
    unique_motif = set()
    length_order = []
    for i in dseq:
        if '(' in i:
            end_idx = i.index(')')
            tmp_motif = i[1:end_idx]
            #if tmp_motif != MOTIF:
                #tmp_motif = get_canonical_motif(tmp_motif, MOTIF)
            #else:
                #print('*********', tmp_motif)
            tmp_motif = get_canonical_motif(tmp_motif, MOTIF)
            motif_order.append(tmp_motif)
            unique_motif.add(tmp_motif)
            length_order.append(int(i[end_idx+1:]) * len(tmp_motif))
        else:
            motif_order.append(i)
            length_order.append(len(i))
    return [motif_order, unique_motif, length_order]

def cg_pos(seq):
    start_positions = [m.start() for m in re.finditer("CG", seq, overlapped=False)]
    return start_positions

def visuamitra_data_extract(file, chr=None, start_coord=None, end_coord=None, outfile='tmp_vismtr.tsv'):
    # out = open('visua_intermediate.tsv', 'w')
    out = open(outfile, 'w')
    header = ['Chrom', 'Start', 'End', 'Motif', 'Motif_size', 'GT', 'Sequences', 'Read_support', 'Decomp_seq', 'Decomp_info', 'Unique_motifs', 'Mean_meth', 'Meth_tag']
    print(*header, file=out, sep='\t')
    
    # file = '1KGP_ICR/sorted_hg002_icr_cpg.vcf.gz'
    # chr = 'chr1'
    # start_coord = 9234669
    # end_coord = 24503200
    vcf_obj = pysam.TabixFile(file)
    # for locus in vcf_obj.fetch(chr, start_coord, end_coord):
    for locus in vcf_obj.fetch(chr, start_coord, end_coord):
        # print('Locus = ', locus)
        locus = locus.strip().split('\t')
        if locus[6]!='PASS': continue
        CHROM = locus[0]
        START = locus[1]
        REF = locus[3]
        INFO = locus[7].split(';')
        ID = INFO[5].split('=')[1]
        if ID == '.':
            ID = 'NA'
        END = INFO[4].split('=')[1]
        MOTIF = INFO[2].split('=')[1]
        MOTIF_SIZE = len(MOTIF)
        MOTIF_DECOMP = True
        if MOTIF_SIZE > 10:
            MOTIF_DECOMP = False
        REF_DECOMP, _ = motif_decomposition(REF, MOTIF_SIZE) if MOTIF_SIZE < 11 else [None,None]
        SAMPLE = locus[9].split(':')
        try:
            GT = set([SAMPLE[0][0], SAMPLE[0][2]])
        except:
            print(locus)
            sys.exit(1)
        
        if SAMPLE[7] != '.,.':
            MM = [float(i) for i in SAMPLE[7].split(',')]
        else:
            MM = 'NA'
            
        MV = SAMPLE[10].split(',')
        
        SD = [int(i) for i in SAMPLE[3].split(',')]
        DS = SAMPLE[9].split(',')
        CREATE_DECOMP = ('.' in DS) and MOTIF_DECOMP
        
        alt = locus[4]
        if alt == '.':
            alt1 = REF
            alt2 = REF
            DS = [REF_DECOMP, REF_DECOMP]
        else:
            alt = alt.split(',')
            if len(alt)==2:
                alt1 = alt[0]
                alt2 = alt[1]
                if CREATE_DECOMP:
                    DS = []
                    for seq in alt:
                        dseq, _ = motif_decomposition(seq, MOTIF_SIZE)
                        DS.append(dseq)                
            elif len(GT)==2:
                alt1 = REF
                alt2 = alt[0]
                if CREATE_DECOMP:
                    DS = [REF_DECOMP]
                    dseq, _ = motif_decomposition(alt2, MOTIF_SIZE)
                    DS.append(dseq)
                else:
                    DS = [REF_DECOMP, DS[0]]
            else:
                alt1 = alt[0]
                alt2 = alt[0]
                if GT=={'0'}: DS = [REF_DECOMP, REF_DECOMP]
                elif CREATE_DECOMP:
                    dseq, _ = motif_decomposition(alt1, MOTIF_SIZE)
                    DS = [dseq] * 2
                else:
                    DS = DS * 2
        if '.' in DS:
            DS = [None, None]
    
        complete_seqs = [REF, alt1, alt2]
        if '.' not in MV:
            decoded_MV = [[cg_pos(complete_seqs[idx+1]), [decode64_dict[i] for i in tag]] for idx,tag in enumerate(MV)]
        else:
            decoded_MV = 'NA'
            
        try:
            complete_DS = [REF_DECOMP, DS[0], DS[1]]
        except:
            print(DS)
            print(locus)
            sys.exit(1)
        DS_info = []
        motif_set = set()
        for i in complete_DS:
            if i is not None:
                motif_order, unique_motif, length_order = motif_decomp_pos(i)
                DS_info.append([motif_order, length_order])
                motif_set |= unique_motif
            else:
                DS_info.append([None, None])
        motif_set = list(motif_set)
    
        if None in complete_DS:
            complete_DS = 'NA'
            DS_info = 'NA'
            motif_set = 'NA'
        
            
        values = [CHROM, START, END, ID, MOTIF, MOTIF_SIZE, SAMPLE[0], complete_seqs, SD, complete_DS, DS_info, motif_set, MM, decoded_MV]
        print(*values, file=out, sep='\t')
    
    vcf_obj.close()
    out.close()

def is_valid_repeat_block(s):

    if not s.startswith('('):
        return False
    if ')' not in s:
        return False
    close = s.find(')')
    if close <= 1:
        return False
    return s[close+1:].isdigit()


def get_repeat_components(s):

    close = s.index(')')
    motif = s[1:close]
    count = int(s[close+1:])
    return motif, count

def get_cyclic_variants(motif):
    n = len(motif)
    return [motif[i:] + motif[:i] for i in range(n)]

def get_canonical_motif(motif, r_motif=None):
    motif_list = get_cyclic_variants(motif)
    if r_motif and r_motif in motif_list:
        return r_motif 
    else:
        return min(motif_list)

def register_and_get_motif(motif):
    if not motif or len(motif) == 0:
        return motif
    
    canonical = get_canonical_motif(motif)
    
    if canonical not in cyclic_motif_registry:
        cyclic_motif_registry[canonical] = motif
        return motif
    else:
        return cyclic_motif_registry[canonical]


def convert_to_bitset(seq):
    lbit = {'A': '0', 'C': '0', 'G': '1', 'T': '1', 'N': '1'}
    rbit = {'A': '0', 'C': '1', 'G': '0', 'T': '1', 'N': '1'}
    
    lbitseq = bitarray()
    rbitseq = bitarray()
    
    for s in seq:
        lbitseq.extend(lbit.get(s, '1'))
        rbitseq.extend(rbit.get(s, '1'))
    
    return lbitseq, rbitseq

def shift_and_match(seq):
    shift_list = []
    # best_shift = motif_length
    max_matches = 0

    shift_values = set(range(1, 11))

    for shift in sorted(shift_values):
        if shift < 1:
            continue

        lbitseq, rbitseq = convert_to_bitset(seq)

        lmatch = ~(lbitseq ^ (lbitseq >> shift))
        rmatch = ~(rbitseq ^ (rbitseq >> shift))
        match = lmatch & rmatch
        shift_list.append(match)

    return shift_list

def kmp_search_non_overlapping(text, pattern):
    def compute_lps(pattern):
        lps = [0] * len(pattern)
        length = 0
        i = 1
        while i < len(pattern):
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            else:
                if length != 0:
                    length = lps[length - 1]
                else:
                    lps[i] = 0
                    i += 1
        return lps

    lps = compute_lps(pattern)
    result = []
    i = 0
    j = 0  

    while i < len(text):
        if pattern[j] == text[i]:
            i += 1
            j += 1

        if j == len(pattern):  
            result.append(i - j)
            j = 0  
        elif i < len(text) and pattern[j] != text[i]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    return result

def get_most_frequent_motif(sequence, motif_size, motif):
    cyc_motif = get_canonical_motif(motif) if motif else None
    if len(sequence) < motif_size:  
        return sequence, None  

    repeating_units = [sequence[i:i + motif_size] for i in range(len(sequence) - motif_size + 1)]
    motif_counts = Counter(repeating_units)
    
    
    if not motif_counts:  
        return sequence, None  

    most_common = []
    for each_motif,count in motif_counts.most_common():
        if len(most_common) >=2: break
        if get_canonical_motif(each_motif) == cyc_motif:
            if motif not in most_common: most_common.append(motif)
        else:
            most_common.append(each_motif)

    primary_motif = most_common[0] if most_common else sequence
    primary_motif = register_and_get_motif(primary_motif)
    secondary_motif = most_common[1] if len(most_common) > 1 else None

    return primary_motif, secondary_motif
    
#def get_canonical_motif(motif):
    #return min(motif[i:] + motif[:i] for i in range(len(motif)))

def max_match(shift_list, gap_regions, motif_size):
    gap_wise_shift = []
    
    for start, end in gap_regions:
        gap_length = end - start
        
        candidate_shifts = []
        
        for idx, shift_pattern in enumerate(shift_list):
            if not shift_pattern.any():
                continue
                
            shift_value = idx + 1
            
            if shift_value * 2 > gap_length:  
                continue
                
            sub_pattern = shift_pattern[start:end]
            if len(sub_pattern) == 0:
                continue
            
            total_matches = sub_pattern.count()
            
            pattern_str = sub_pattern.to01()
            max_consecutive = max(len(run) for run in pattern_str.split('0')) if '1' in pattern_str else 0
            ideal_consecutive = max_consecutive + shift_value
            
            # Score based on multiple factors
            #score = (match_density * 0.4) + (max_consecutive / gap_length * 0.4) + (1.0 / shift_value * 0.2)
            
            candidate_shifts.append((shift_value, ideal_consecutive, total_matches))
        
        candidate_shifts.sort(key=lambda x: x[1], reverse=True)
        
        best_shift = -1
               
        for shift_value, ideal_consecutive, total_matches in candidate_shifts:
            #repeat_runs = max_consecutive / shift_value
            if ( ideal_consecutive / shift_value) >= 2.0:
                best_shift = shift_value
                break
        
        gap_wise_shift.append(best_shift)
    
    return gap_wise_shift
    
slide_threshold = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10}
def window_scan(shift_list, motif_size, sequence, sequential_decomp, sequential_part, overall_boundary, current_gap):
    shift_seq = shift_list[motif_size-1]#[current_gap[0]:current_gap[1]]

    slide_size = slide_threshold.get(motif_size, 8)
    # slide_size = motif_size
    
    i=current_gap[0]
    start = i; end = current_gap[1]
    start_track = start
    initial = True
    while i<(current_gap[1]-slide_size + 1):
        words = shift_seq[i:i+slide_size]

        if (words.count()/len(words)) >= 0.9:
            if initial:
                calc_start = i-motif_size if i-motif_size >= start_track else start_track
                if calc_start>-1:
                    for b in overall_boundary:
                        if not (b[0] <= calc_start < b[1]):
                            pass
                        else:
                            start = b[1]
                            break
                    else:
                        start = calc_start
                else:
                    start = i #i-motif_size if i-motif_size > -1 else i
                initial = False
            end = i+motif_size
            i+=motif_size

            continue

        else:
            i+=1
            if not initial:
                calc_end = end+motif_size
                for b in overall_boundary:
                    if (start< calc_end <= b[0]) or (calc_end > start >= b[1]):
                        pass
                    else:
                        end = b[0]
                        break
                else:
                    end = calc_end    
                if start!=end:
                    start_track = decomposer([start, end], sequence, motif_size, sequential_decomp, sequential_part, shift_list, overall_boundary)
                initial = True
    if not initial:
        calc_end = end+motif_size
        for b in overall_boundary:
            if (start< calc_end <= b[0]) or (calc_end > start >= b[1]):
                pass
            else:
                end = b[0]
                break
        else:
            end = calc_end 
        if start!=end:
            start_track = decomposer([start, end], sequence, motif_size, sequential_decomp, sequential_part, shift_list, overall_boundary)


def shift_decomp(seq, motif_size, motif, boundary, state):
    decomposed_parts = []
    count = 1  
    
    primary_motif, _ = get_most_frequent_motif(seq, motif_size, motif)
    
    positions = kmp_search_non_overlapping(seq, primary_motif)
    
    if not positions:
        return [seq], boundary


    seq = seq[positions[0] : positions[-1]+motif_size]
    
    if state:
        b1 = boundary[0]
        boundary = [b1+positions[0], b1+positions[-1]+motif_size]

        
    for i in range(1, len(positions)):
        if positions[i] == positions[i - 1] + len(primary_motif):
            count += 1
        else:
            if count > 1:
                decomposed_parts.append(f"({primary_motif}){count}")
            else:
                decomposed_parts.append(primary_motif)
            interspersed = seq[positions[i - 1] + len(primary_motif):positions[i]]
            if interspersed:
                primary_motif, secondary_motif = get_most_frequent_motif(seq, motif_size, '')
                secondary_decomp, boundary = shift_decomp(interspersed, motif_size, '', boundary, False)
                if secondary_decomp:
                    decomposed_parts.extend(secondary_decomp)

            count = 1
            
    if count > 1:
        decomposed_parts.append(f"({primary_motif}){count}")
    else:
        decomposed_parts.append(primary_motif)
    # decomposed_parts.append(f"({primary_motif}){count}")
    last_motif_end = positions[-1] + len(primary_motif)
    leftover_sequence = seq[last_motif_end:]
    if leftover_sequence:
        decomposed_parts.append(leftover_sequence)
    return decomposed_parts, boundary

def decomposer(tuple_bound, sequence, best_shift, sequential_decomp, sequential_part, shift_list, overall_boundary):
    processed_seq, tuple_bound = shift_decomp(sequence[tuple_bound[0]:tuple_bound[1]], best_shift, '', tuple_bound, True)
    b1 = tuple_bound[0]; b2 = tuple_bound[1]
    sequential_decomp[b1] = processed_seq
    sequential_part[b1:b2] = 0
    for id in range(len(shift_list)):
        if shift_list[id] == 0: continue
        shift_list[id][b1:b2] = 0
    overall_boundary.append(tuple_bound)
    return b2

def gap_boundaries(overall_boundary, seq_len, chunk_state):
    overall_boundary = sorted(overall_boundary)

    if chunk_state and len(overall_boundary)>=1:
        if len(overall_boundary)>1:
            chunk_boundary = overall_boundary[0][0]
            chunk_boundary_end = overall_boundary[-1][1]
        else:
            chunk_boundary = overall_boundary[0][0]
            chunk_boundary_end = seq_len
    else:
        chunk_boundary = 0
        chunk_boundary_end = seq_len
        
    last_start = overall_boundary[-1][0]
    gap_regions = []
    for id,occupied_reg in enumerate(overall_boundary):
    
        if id == 0:
            current_end = occupied_reg[1]
            if occupied_reg[0] != chunk_boundary:
                gap_regions.append([chunk_boundary, occupied_reg[0]])
            elif len(overall_boundary) == 1:
                if occupied_reg[1] <= (seq_len-1):
                    gap_regions.append([occupied_reg[1],seq_len])
                    current_end = seq_len
            
    
        else:
            if occupied_reg[0] != current_end:
                gap_regions.append([current_end, occupied_reg[0]])
            current_end = occupied_reg[1]

            
    if current_end < chunk_boundary_end:
        gap_regions.append([current_end, chunk_boundary_end])

    return gap_regions

def motif_decomposition(sequence, motif_size):

    global cyclic_motif_registry
    cyclic_motif_registry = {}
    

    shift_list = shift_and_match(sequence)
    overall_boundary = []
    sequential_decomp = {}
    sequential_part = bitarray([1]*len(sequence))
    seq_len = len(sequence)
    gap_regions = [[0, seq_len]]
    rounds = 0
    while any(sequential_part):
        if rounds == 1:
            shift_list[0][:] = 0
            
        if (rounds==0) and (motif_size==1):
            gap_wise_shift = [1]
        else:
            gap_wise_shift = max_match(shift_list, gap_regions, motif_size)

        for index, best_shift in enumerate(gap_wise_shift):
            
            current_gap = gap_regions[index]
            
            if best_shift!=-1:
                previous_ovbound = overall_boundary.copy()
                window_scan(shift_list, best_shift, sequence, sequential_decomp, sequential_part, overall_boundary, current_gap)
                if previous_ovbound == overall_boundary:
 
                    c1 = current_gap[0]; c2 = current_gap[1]
                    covered_chunks = [i for i in overall_boundary if (i[0]>=c1 and i[1]<=c2) or ((i[1]==c1) or (i[0]==c2))]

                    if covered_chunks == []:
                        sequential_part[c1 : c2] = 0
                        sequential_decomp[c1] = [sequence[c1 : c2]]
                        overall_boundary.append([c1,c2])
                        continue

                    gap_in_chunks = gap_boundaries(covered_chunks, c2, True)
                    if not gap_in_chunks:
                        if (c1 == 0) or (c2 == seq_len):
                            gap_in_chunks = [current_gap]

                    for each_gap in gap_in_chunks:
                        sequential_part[each_gap[0] : each_gap[1]] = 0
                        for shift_id in range(len(shift_list)):
                            shift_list[shift_id][each_gap[0] : each_gap[1]] = 0
                        sequential_decomp[each_gap[0]] = [sequence[each_gap[0] : each_gap[1]]]

                        overall_boundary.append([each_gap[0] , each_gap[1]])

                
            else:
                if sequence[current_gap[0] : current_gap[1]]:
                    sequential_decomp[current_gap[0]] = [sequence[current_gap[0] : current_gap[1]] ]
                sequential_part[current_gap[0] : current_gap[1]] = 0
                overall_boundary.append([current_gap[0] , current_gap[1]])

        gap_regions = gap_boundaries(overall_boundary, seq_len, False)

        rounds += 1
        if rounds >= 20 :
            warnings.warn("Max rounds reached; decomposition may be incomplete")
        
    fseq = [i for k,v in sorted(sequential_decomp.items(), key = lambda x : x[0]) for i in v]

    if len(fseq)==1:
        if '(' in fseq[0]:
            non_rep_percent = 0
        else:
            non_rep_percent=1
    else:
        fseq, non_rep_percent = refine_decomposition(fseq, motif_size, len(sequence))

    return ["-".join(fseq), non_rep_percent]

def refine_decomposition(fseq, motif_size, seq_len):

    
    new_seq_list = []
    non_repeat = 0
    
    for i in fseq:
        if '(' in i and ')' in i:  # refining only the decomposed parts
            try:
                end_point = i.index(')')
                count = int(i[end_point+1:])
                tmp_motif = i[1:end_point]
                motif_len = len(tmp_motif)
                
                if len(set(tmp_motif)) == 1:
                    new_seq_list.append(f'({tmp_motif[0]}){motif_len*count}')
                
                elif (motif_len % 2 == 0):  
                    mid_point = int(motif_len/2)
                    if tmp_motif[0: mid_point] == tmp_motif[mid_point:]:
                        check_motif = tmp_motif[0: mid_point]
                        new_seq_list.append(f'({check_motif}){count*2}')
                    else:
                        new_seq_list.append(i)
                        
                elif motif_len <= motif_size:  
                    new_seq_list.append(i)
                        
                elif (motif_len != 1) and (motif_len > motif_size) and (motif_len % motif_size == 0):
                    for div in divisor_dict.get(motif_len, [1]):
                        check_motif = tmp_motif[:div]
                        e = 0
                        pattern = "(" + check_motif + "){e<=" + str(e) + "}"
                        matches = re.finditer(pattern, tmp_motif, overlapped=False)
                        tot_rep = sum(1 for _ in matches)
                        if tot_rep * len(check_motif) == motif_len:
                            motif_count = tot_rep * count
                            new_seq_list.append(f'({check_motif}){motif_count}')
                            break
                    else:
                        new_seq_list.append(i)
                else:
                    new_seq_list.append(i)
            except (ValueError, IndexError):
                new_seq_list.append(i)
        else:

            segment = i
            decomposed_segment = []
            
            pos = 0
            while pos < len(segment):
                found_repeat = False
                
                for test_len in range(motif_size, min(6, len(segment) - pos) + 1):
                    if test_len == 0:
                        continue
                    
                    test_motif = segment[pos:pos+test_len]
                    
                    count = 1
                    next_pos = pos + test_len
                    
                    while next_pos + test_len <= len(segment) and segment[next_pos:next_pos+test_len] == test_motif:
                        count += 1
                        next_pos += test_len
                    
                    if count >= 2:
                        decomposed_segment.append(f'({test_motif}){count}')
                        pos = next_pos
                        found_repeat = True
                        break
                
                if not found_repeat:

                    remaining_len = len(segment) - pos
                    if remaining_len <= motif_size:
                        decomposed_segment.append(segment[pos:])
                        break
                    else:
                        chunk_size = min(motif_size, remaining_len)
                        decomposed_segment.append(segment[pos:pos+chunk_size])
                        pos += chunk_size
            
            if len(decomposed_segment) > 1 or (len(decomposed_segment) == 1 and '(' in decomposed_segment[0]):
                new_seq_list.extend(decomposed_segment)
            else:
                new_seq_list.append(i)
                non_repeat += len(i)

    
    dlen = len(new_seq_list) - 1
    loc = 0
    tmp_loc = 1 # different value then 'loc' to start the loop
    refined_list = []
    
    while loc < dlen:
        if tmp_loc != loc:
            current = new_seq_list[loc]
        else:
            loc += 1
            # if loc >= dlen: break
            if (loc == dlen) and current:
                refined_list.append(current)
                loc += 1
                break
        tmp_loc = loc
        next_item = new_seq_list[loc+1]

        current_state = 1 if '(' in current and ')' in current else 0
        next_state = 1 if '(' in next_item and ')' in next_item else 0
        
        if current_state == 1 and next_state == 1:
            try:
                e1 = current.index(')')
                e2 = next_item.index(')')
                tmp1 = current[1:e1]
                tmp2 = next_item[1:e2]
                
                if tmp1 == tmp2:  
                    combined_count = int(current[e1+1:]) + int(next_item[e2+1:])
                    refined_list.append(f'({tmp1}){combined_count}')
                    loc += 2
                else:
                    refined_list.append(current)
                    loc += 1
            except (ValueError, IndexError):
                refined_list.append(current)
                loc += 1
                
        elif current_state == 1 and next_state == 0:
            try:
                e1 = current.index(')')
                tmp1 = current[1:e1]
                
                if len(next_item) >= len(tmp1) and tmp1 == next_item[0:len(tmp1)]:
                    combined_count = int(current[e1+1:]) + 1
                    remaining = next_item[len(tmp1):]

                    while tmp1 == remaining[0:len(tmp1)]:
                        combined_count += 1 
                        remaining = remaining[len(tmp1):]
                        if (len(remaining)==1) and tmp1 == remaining:
                            combined_count += 1
                            remaining = ''
                            break
                    
                    refined_list.append(f'({tmp1}){combined_count}')
                    
                    if remaining:
                        current = remaining
                        loc += 1
                    else:
                        loc += 2
                        
                elif tmp1 == next_item:  
                    combined_count = int(current[e1+1:]) + 1
                    refined_list.append(f'({tmp1}){combined_count}')
                    loc += 2
                else:
                    refined_list.append(current)
                    loc += 1
                    
            except (ValueError, IndexError):
                refined_list.append(current)
                loc += 1
                
        elif current_state == 0 and next_state == 1:
            try:
                e2 = next_item.index(')')
                tmp2 = next_item[1:e2]
                
                if len(current) >= len(tmp2) and tmp2 == current[len(current)-len(tmp2):]:
                    combined_count = int(next_item[e2+1:]) + 1
                    
                    beginning = current[:len(current)-len(tmp2)]
                    if beginning:
                        refined_list.append(beginning)
                    
                    refined_list.append(f'({tmp2}){combined_count}')
                    loc += 2
                elif tmp2 == current:  
                    combined_count = int(next_item[e2+1:]) + 1
                    refined_list.append(f'({tmp2}){combined_count}')
                    loc += 2
                else:
                    refined_list.append(current)
                    loc += 1
            except (ValueError, IndexError):
                refined_list.append(current)
                loc += 1
                
        else:
            current = current + next_item

    
    if loc == dlen:
        refined_list.append(new_seq_list[loc])

    
    final_merged = []
    i = 0
    while i < len(refined_list):
        if i < len(refined_list) - 1:
            current = refined_list[i]
            next_item = refined_list[i+1]
            
            if '(' in current and ')' in current and '(' in next_item and ')' in next_item:
                try:
                    e1 = current.index(')')
                    e2 = next_item.index(')')
                    tmp1 = current[1:e1]
                    tmp2 = next_item[1:e2]
                    
                    if tmp1 == tmp2:
                        combined_count = int(current[e1+1:]) + int(next_item[e2+1:])
                        final_merged.append(f'({tmp1}){combined_count}')
                        i += 2
                        continue
                except (ValueError, IndexError):
                    pass
        
        final_merged.append(refined_list[i])
        i += 1
    
    non_repeat_len = 0
    for elem in final_merged:
        if '(' in elem and ')' in elem:
            try:
                end_point = elem.index(')')
                pass
            except ValueError:
                non_repeat_len += len(elem)
        else:
            non_repeat_len += len(elem)
    
    non_rep_percent = round((non_repeat_len / seq_len), 2) if seq_len > 0 else 0
    
    return final_merged, non_rep_percent

# Newly added

def extract_methcutoff(file):
    try:
        vcf_obj = pysam.VariantFile(file)
        cutoff_desc = vcf_obj.header.info["MPC"].description
        total_samples = list(vcf_obj.header.samples)
        vcf_obj.close()
        return cutoff_desc, total_samples
    
    except (KeyError, AttributeError):
        return "Not specified", list(pysam.VariantFile(file).header.samples)
    except Exception as e:
        return f"Error: {str(e)}", []

def visuamitra_data_extract_stream(file, chr=None, start_coord=None, end_coord=None, samples_index=None):
    #print("!!! VERSION CHECK: [B-12] - April 27th !!!")
    # 1. Normalize Chromosome
    if chr and not str(chr).startswith('chr'):
        chr = f"chr{chr}"

    # DEBUG 1: Input Check
    print(f"\n[BACKEND DEBUG] Requesting: {chr}:{start_coord}-{end_coord}")

    cutoff_info, total_samples = extract_methcutoff(file)
    if samples_index is None:
        samples_index = [0]
    
    yield f"##METADATA\t{cutoff_info}\n"
    yield f"##SAMPLES\t{','.join(total_samples)}\n"

    header = [
        'Chrom', 'Start', 'End', 'ID', 'Motif', 'Motif_size',
        'SampleID', 'SampleIdx', 'GT',
        'Sequences', 'Read_support', 'Decomp_seq', 'Decomp_info',
        'Unique_motifs', 'Mean_meth', 'Meth_tag'
    ]
    yield "\t".join(header) + "\n"

    vcf_obj = pysam.TabixFile(file)
    row_yielded_count = 0 # Initialized here to avoid NameError

    try:
        # DEBUG 2: Index Check
        if chr not in vcf_obj.contigs:
            print(f"[BACKEND DEBUG] ERROR: Chromosome '{chr}' not in VCF index.")
            return

        # 1. Handle Start: fallback to 0 if None
        start_val = int(start_coord) if start_coord is not None else 0
        search_start = max(0, start_val - 1)

        # 2. Handle End: fallback to max integer if None (pysam handles this as EOF)
        if end_coord is not None:
            search_end = int(end_coord)
        else:
            search_end = 2147483647 # Max 32-bit int; pysam will just read until the last record
            print(f"[BACKEND DEBUG] end_coord is None. Falling back to end of chromosome.")

        for i, locus_raw in enumerate(vcf_obj.fetch(chr, search_start, search_end)):
            try: 
                locus = locus_raw.strip().split('\t')
                if len(locus) < 10: continue


                # Safely parse Info
                info_parts = [x.split('=') for x in locus[7].split(';') if '=' in x]
                info_dict = {x[0]: x[1] for x in info_parts}

                if locus[6] not in ['PASS', '.', '0', '']:
                    continue

                CHROM, START, REF = locus[0], locus[1], locus[3]
                ALT = locus[4].split(',')
                
                # Use ID from info if column 2 is empty
                ID, END = info_dict.get('ID', locus[2]), info_dict.get('END', START)
                MOTIF = info_dict.get('MOTIF', 'NA')
                MOTIF_SIZE = len(MOTIF)
                MOTIF_DECOMP = MOTIF_SIZE <= 10
                
                if REF.islower(): REF = REF.upper()
                REF_DECOMP, _ = motif_decomposition(REF, MOTIF_SIZE) if MOTIF_DECOMP else [None, None]

                sample_fields = locus[9:]
                valid_indices = [idx for idx in samples_index if idx < len(sample_fields)]

                if not valid_indices: continue

                # This is where the crash usually happens
                SAMPLE_dict = sample_collector(sample_fields, valid_indices, ALT, MOTIF_DECOMP, REF_DECOMP, REF, MOTIF_SIZE, MOTIF)

                for s_idx in valid_indices:
                    data = SAMPLE_dict.get(s_idx)
                    if data is None: continue
                    
                    s_name_full = total_samples[s_idx] if s_idx < len(total_samples) else f"S{s_idx}"
                    # Clean name for frontend matching
                    s_name_clean = s_name_full

                    values = [
                        CHROM, START, END, ID, MOTIF, MOTIF_SIZE,
                        s_name_clean, s_idx, data[0], 
                        data[1], data[2], data[3], data[4], 
                        data[5], data[6], data[7]
                    ]
                    yield "\t".join(map(str, values)) + "\n"
                    row_yielded_count += 1

            except Exception as row_err: 
                # This catches the "index out of range" for just THIS row
                print(f"[DEBUG] Skipping malformed row {i} at {locus[1] if len(locus)>1 else 'unknown'}: {row_err}")
                continue 

        print(f"[BACKEND DEBUG] Successfully yielded {row_yielded_count} data rows.")

    except Exception as e:
        print(f"[BACKEND DEBUG] CRASH: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        vcf_obj.close()

def sample_collector(sample_fields, sample_index, ALT, MOTIF_DECOMP, REF_DECOMP, REF, MOTIF_SIZE, MOTIF):
    """Logic to process specific sample columns."""
    SAMPLE_dict = {}
    
    for each_sidx in sample_index:
        if each_sidx >= len(sample_fields): 
            SAMPLE_dict[each_sidx] = ['./.', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']
            continue
        
        SAMPLE = sample_fields[each_sidx].split(':')
        gt_value = SAMPLE[0]
        
        if gt_value in ['.', './.', '.|.']:
            SAMPLE_dict[each_sidx] = ['./.', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']
            continue
            
        # 1. Extract Genotype Indices
        sep = '/' if '/' in gt_value else '|'
        try:
            gt_indices = [int(i) for i in gt_value.split(sep) if i != '.']
            while len(gt_indices) < 2:
                gt_indices.append(gt_indices[0] if gt_indices else 0)
            v1, v2 = gt_indices[0], gt_indices[1]
        except ValueError:
            v1, v2 = 0, 0
        
        # 2. Extract Sequences
        alt1 = REF if v1 == 0 else (ALT[v1 - 1] if (v1 - 1) < len(ALT) else REF)
        alt2 = REF if v2 == 0 else (ALT[v2 - 1] if (v2 - 1) < len(ALT) else REF)

        # 3. Pull Metadata Tags
        MM = [float(i) if i != '.' else 0.0 for i in SAMPLE[8].split(',')] if len(SAMPLE) > 8 else 'NA'
        MV = SAMPLE[11].split(',') if len(SAMPLE) > 11 else []
        SD = [int(i) if i != '.' else 0 for i in SAMPLE[4].split(',')] if len(SAMPLE) > 4 else []
        DS_raw = SAMPLE[10].split(',') if len(SAMPLE) > 10 else ['.', '.']
        CREATE_DECOMP = ('.' in DS_raw) and MOTIF_DECOMP

        # 4. Handle Decomposition (Handles 0/3, 1/1, etc.)
        tmp_DS = []
        # We use a counter to pull from the VCF tags only when we hit an ALT allele
        alt_tag_index = 0 

        for val, seq in [(v1, alt1), (v2, alt2)]:
            if val == 0:
                # It's the reference! Use the pre-calculated REF_DECOMP
                tmp_DS.append(REF_DECOMP)
            else:
                # It's an ALT! Pull from the VCF tags using our counter
                if CREATE_DECOMP:
                    dseq, _ = motif_decomposition(seq, MOTIF_SIZE)
                    tmp_DS.append(dseq)
                else:
                    # Grab the next available tag from the VCF
                    d_val = DS_raw[alt_tag_index] if alt_tag_index < len(DS_raw) else "NA"
                    tmp_DS.append(d_val)
                    alt_tag_index += 1
        DS = tmp_DS
    
        complete_seqs = [REF, alt1, alt2]
        
        # 5. Decode Methylation (Uses global cg_pos and decode64_dict)
        if len(SAMPLE) > 11 and SAMPLE[11] != '.,.':
            decoded_MV = []
            alt_tag_index = 0
            for idx, val in enumerate([v1, v2]):
                if val == 0:
                    # For Reference, we typically have no methylation data in the VCF tags
                    # You can leave it empty or fetch a default
                    decoded_MV.append([cg_pos(REF), []])
                else:
                    # Map the tag to the ALT allele
                    if alt_tag_index < len(MV):
                        tag = MV[alt_tag_index]
                        decoded_MV.append([cg_pos(complete_seqs[idx+1]), [decode64_dict[i] for i in tag]])
                        alt_tag_index += 1
                    else:
                        decoded_MV.append([None, None])
        else:
            decoded_MV = 'NA'
        
        complete_DS = [REF_DECOMP, DS[0], DS[1]]
        
        DS_info = []
        motif_set = set()
        for i in complete_DS:
            if i is not None and i != "NA":
                motif_order, unique_motif, length_order = motif_decomp_pos(i, MOTIF)
                DS_info.append([motif_order, length_order])
                motif_set |= unique_motif
            else:
                DS_info.append([None, None])
        
        motif_set = list(motif_set)
        # Final safety check
        if any(d is None or d == "NA" for d in complete_DS):
             # This prevents the visualizer from crashing on empty data
             pass 

        SAMPLE_dict[each_sidx] = [gt_value, complete_seqs, SD, complete_DS, DS_info, motif_set, MM, decoded_MV]
        
    return SAMPLE_dict