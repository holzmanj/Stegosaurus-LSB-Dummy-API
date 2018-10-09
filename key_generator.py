from hashlib import sha256

def generate_keys(passwd):
	prelim_hash = sha256(passwd.encode())
	print("prelim_hash:     %s" % prelim_hash.digest())
	print("prelim_hash hex: %s" % prelim_hash.hexdigest())
	client_key_input = passwd.encode() + prelim_hash.digest()[16:]
	client_key = sha256(client_key_input)
	print("client_key:     %s" % client_key.digest())
	print("client_key hex: %s" % client_key.hexdigest())
	server_key_input = passwd.encode() + prelim_hash.digest()[:16]
	server_key = sha256(server_key_input)
	print("server_key:     %s" % server_key.digest())
	print("server_key hex: %s" % server_key.hexdigest())

